---
trigger: always_on
description: Batasan ketat penggunaan Git (commit, push, staging, dan perintah destruktif) di project Tekoala.
---

# Aturan Git Project Tekoala

1. **DILARANG auto-commit atau auto-push.** Jangan pernah menjalankan `git commit` atau `git push` tanpa instruksi eksplisit dari user (mis. `"tolong push"`, `"commit dan push"`). Jangan mengasumsikan balasan umum seperti `"lanjut"` atau `"continue"` sebagai perintah untuk push.
2. **Wajib `npm run build` sebelum commit** karena folder `build/` ikut di-commit ke repository untuk deployment produksi.
3. **Staging selektif:** Selalu cek `git status --short` terlebih dahulu. Jangan pernah meng-commit `.vscode/`, `.idea/`, `.claude/`, `.DS_Store`, atau file sementara/rahasia.
4. **DILARANG menjalankan perintah Git destruktif** (`git reset --hard`, `git push --force`, `git clean -fd`, `git checkout -- .`) kecuali diminta secara spesifik oleh user.

