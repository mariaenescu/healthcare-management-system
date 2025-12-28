find . \
  -path "*/node_modules/*" -prune -o \
  -path "*/.git/*"         -prune -o \
  -path "*/.idea/*"        -prune -o \
  -print