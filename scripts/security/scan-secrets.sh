#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONFIG_PATH="$ROOT_DIR/.gitleaks.toml"
MODE="${1:---repo}"

run_gitleaks_detect() {
  local source_path="$1"

  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks detect \
      --no-git \
      --source "$source_path" \
      --config "$CONFIG_PATH" \
      --redact \
      --verbose
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm \
      -v "$source_path:/scan:ro" \
      -v "$CONFIG_PATH:/config.toml:ro" \
      zricethezav/gitleaks:latest detect \
      --no-git \
      --source /scan \
      --config /config.toml \
      --redact \
      --verbose
    return
  fi

  echo "Neither gitleaks nor docker is available."
  echo "Install gitleaks (example macOS): brew install gitleaks"
  exit 127
}

run_repo_scan() {
  echo "Running full repository secret scan..."

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap "rm -rf '$tmp_dir'" EXIT

  local repo_files=()
  while IFS= read -r file_path; do
    repo_files+=("$file_path")
  done < <(git -C "$ROOT_DIR" ls-files --cached --others --exclude-standard)

  if [[ ${#repo_files[@]} -eq 0 ]]; then
    echo "No repository files to scan."
    return 0
  fi

  local copied_files=0

  for file_path in "${repo_files[@]}"; do
    if [[ ! -f "$ROOT_DIR/$file_path" ]]; then
      continue
    fi

    mkdir -p "$tmp_dir/$(dirname "$file_path")"
    cp "$ROOT_DIR/$file_path" "$tmp_dir/$file_path"
    copied_files=1
  done

  if [[ $copied_files -eq 0 ]]; then
    echo "No file snapshots to scan."
    return 0
  fi

  run_gitleaks_detect "$tmp_dir"
}

run_staged_scan() {
  echo "Running staged files secret scan..."

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap "rm -rf '$tmp_dir'" EXIT

  local staged_files=()
  while IFS= read -r file_path; do
    staged_files+=("$file_path")
  done < <(git -C "$ROOT_DIR" diff --cached --name-only --diff-filter=ACMR)

  if [[ ${#staged_files[@]} -eq 0 ]]; then
    echo "No staged files to scan."
    return 0
  fi

  local copied_files=0

  for file_path in "${staged_files[@]}"; do
    if ! git -C "$ROOT_DIR" cat-file -e ":$file_path" 2>/dev/null; then
      continue
    fi

    mkdir -p "$tmp_dir/$(dirname "$file_path")"
    git -C "$ROOT_DIR" show ":$file_path" > "$tmp_dir/$file_path"
    copied_files=1
  done

  if [[ $copied_files -eq 0 ]]; then
    echo "No staged file snapshots to scan."
    return 0
  fi

  run_gitleaks_detect "$tmp_dir"
}

case "$MODE" in
  --repo)
    run_repo_scan
    ;;
  --staged)
    run_staged_scan
    ;;
  *)
    echo "Usage: $0 [--repo|--staged]"
    exit 2
    ;;
esac
