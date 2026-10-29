#!/usr/bin/env python3
"""Выпуск новой версии:  python3 release.py 1.10
Меняет номер версии в sw.js и index.html одновременно."""
import re, sys
if len(sys.argv) != 2 or not re.fullmatch(r"\d+(\.\d+)*", sys.argv[1]):
    sys.exit("Использование: python3 release.py 1.10")
v = sys.argv[1]
for path, pat, rep in [
    ("sw.js", r'const VERSION = "[^"]*";', 'const VERSION = "%s";' % v),
    ("index.html", r'var APP_VERSION = "[^"]*";', 'var APP_VERSION = "%s";' % v),
]:
    s = open(path, encoding="utf-8").read()
    s2, n = re.subn(pat, rep, s)
    if n != 1: sys.exit("Не найдено значение версии в " + path)
    open(path, "w", encoding="utf-8").write(s2)
print("Версия обновлена до", v, "— закоммитьте и запушьте изменения.")
