---
title: "CMake の環境の組み方"
emoji: "😫"
type: "tech"
topics: [cmake]
published: false
---

# CMake 環境変数の覚書

# CMAKE 環境変数

| 変数 | 説明 |
|---|---|
| `CMAKE_CXX_FLAGS` | コンパイラーフラッグ |
| `CMAKE_BUILD_TYPE` | ビルドタイプ |
| `CMAKE_CXX_FLAGS_RELEASE` | `CMAKE_BUILT_TYPE` が `Release` にセットされた時に `CMAKE_CXX_FLAGS` とともにセットされるフラッグ |
| `CMAKE_CXX_FLAGS_DEBUG` | `CMAKE_BUILT_TYPE` が `Debug` にセットされた時に `CMAKE_CXX_FLAGS` とともにセットされるフラッグ |
| `CMAKE_EXPORT_COMPILE_COMMANDS` | `compile_commands.json` を出力する |

* 基本的に `CMAKE` をプレフィックスもつ変数は `CMakeLists.txt` でセットしてはいけない


