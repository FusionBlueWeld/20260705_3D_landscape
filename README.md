# 20260705_3D_landscape

Three.js で描く、絵画調の草原ファンタジー風景プロトタイプです。

## Run

```powershell
& 'C:\Users\tsuts\AppData\Local\Programs\Python\Python312\python.exe' -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

## Notes

- GitHub Pages にそのまま置ける静的構成です。
- Three.js は CDN の ES modules から読み込みます。
- 操作はドラッグで視点回転、ホイールでズーム、右下のコントロールで視点・日照・風を調整できます。
- `assets/concept-target.png` は今回の再デザイン用に生成した参照コンセプトです。
