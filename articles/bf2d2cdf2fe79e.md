---
title: "neovim lua化計画"
emoji: "👻"
Type: "tech" # tech: 技術記事 / idea: アイデア
topics: [ "lua", "neovim" ]
published: false
---

# Neovim を luaで設定する

## ディレクトリ構造
```
├── after/
│   ├── autoload/
│   ├── compiler/
│   ├── ftplugin/
│   └── plugin/
├── init.lua
└── lua/
```
neovim で lua で設定する場合基本的なディレクトリの構造は上のようになります。

　トップレベルにある `init.lua` は自動で読み込まれ実行されるので、基本的にはここ	
に設定を書くことになります。
