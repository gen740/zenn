---
title: "踏み台サーバーから jupyter lab を立ち上げる方法"
emoji: "🐍"
type: "tech"
topics: ["jupyter", "python", "備忘録", "shell"]
published: true
---

# 前提条件

client ↔ middle server ↔ target server
のように middle server を経由して target server にアクセスする場合の設定方法について解説する。

## ssh の設定

* ssh の key を登録する。
    * `~/.ssh/middle` と `~/.ssh/target` は手元に置いておく
* `~/.ssh/config` を設定する

```plain text:~/.ssh/config
Host MiddleServer
        HostName        middle-address
        User            middle-user
        IdentityFile    ~/.ssh/middle

Host TargetServer
        HostName        target-address
        User            middle-user
        IdentityFile    ~/.ssh/target
        proxyCommand    ssh -q -W %h:%p MiddleServer
```

* これで `ssh TargetServer` で踏み台を経由してダイレクトに接続できるようになる

## Jupyter Lab

* port 転送をすることで実現できる。

```plain text
Host MiddleServer
        HostName        middle-address
        User            middle-user
        IdentityFile    ~/.ssh/middle
        LocalForward    8888 localhost:8888

Host TargetServer
        HostName        target-address
        User            middle-user
        IdentityFile    ~/.ssh/target
        proxyCommand    ssh -q -W %h:%p MiddleServer
        LocalForward    8888 localhost:8888        
```

* port はお好みで設定する。