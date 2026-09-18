# Codex 규칙 블록 템플릿

`kna-13-codex` 가 placeholder를 치환해 `~/.codex/AGENTS.md` 의 마커 구간에 넣는다.
규칙 본문의 단일 출처는 `agents/_shared/wiki-rules.ko.md` 이며, 이 파일은 Codex 주입 형식이다.

블록 본문은 `block.md` 에 있다(1행이 start 마커, 마지막 행이 end 마커 — `managed-block.mjs apply` 의 계약).
