sanitize_filename() {
  local name="$1"
  name="${name//.pdf.pdf/.pdf}"
  echo "$name" | perl -CS -pe 's/[\x{10000}-\x{10FFFF}\x{25FB}\x{FE0F}]//g'
}
sanitize_filename "解答_有機化学_典型問題その1.pdf.pdf"
sanitize_filename "◻️解答◻️_有機化学_典型問題.pdf"
sanitize_filename "😀テスト🤔.pdf"
