"""
修仙贸易 - 立绘抠图脚本
用法: python3 scripts/chroma_key.py <输入图片路径> [输出路径]

对纯色背景（尤绿色幕布）的半身立绘做：
  1. 自动采样四角获取背景色
  2. 硬阈值抠图 + 过渡带溢色抑制
  3. 左右各裁切 25%
  4. 缩放至高度 600px
  5. 输出 WebP（RGBA）

示例:
  python3 scripts/chroma_key.py char-01-new.png
  python3 scripts/chroma_key.py raw.png public/images/portraits/output.webp
"""

import sys
import math
from PIL import Image


def chroma_key(src: str, dst: str = '') -> str:
    img = Image.open(src)
    w, h = img.size

    # 1. Crop 25% from left and right
    crop_left = int(w * 0.25)
    crop_right = int(w * 0.75)
    cropped = img.crop((crop_left, 0, crop_right, h))

    # 2. Resize to 600px tall
    new_h = 600
    ratio = new_h / h
    new_w = int(cropped.width * ratio)
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    print(f'Resized: {resized.size}')

    pixels = resized.load()
    rw, rh = resized.size

    # 3. Sample background color from four corners
    samples = []
    for x in range(10):
        for y in range(10):
            samples.append(pixels[x, y][:3])
            samples.append(pixels[rw - 1 - x, y][:3])
            samples.append(pixels[x, rh - 1 - y][:3])
            samples.append(pixels[rw - 1 - x, rh - 1 - y][:3])
    bg_r = sum(s[0] for s in samples) // len(samples)
    bg_g = sum(s[1] for s in samples) // len(samples)
    bg_b = sum(s[2] for s in samples) // len(samples)
    print(f'Background color: ({bg_r}, {bg_g}, {bg_b})')

    # 4. Chroma key with spill suppression
    inner = 80   # below → fully transparent
    outer = 120  # above → fully opaque

    out = Image.new('RGBA', (rw, rh))
    out_pixels = out.load()

    t = o = s = 0
    for y in range(rh):
        for x in range(rw):
            pr, pg, pb = pixels[x, y][:3]
            dist = math.sqrt((pr - bg_r) ** 2 + (pg - bg_g) ** 2 + (pb - bg_b) ** 2)

            if dist <= inner:
                out_pixels[x, y] = (pr, pg, pb, 0)
                t += 1
            elif dist >= outer:
                out_pixels[x, y] = (pr, pg, pb, 255)
                o += 1
            else:
                alpha = (dist - inner) / (outer - inner)
                a_byte = int(alpha * 255)

                # Spill suppression: reduce green excess
                nr, ng, nb = pr, pg, pb
                if pg > pr and pg > pb:
                    excess = pg - max(pr, pb)
                    suppress = 1 - alpha
                    ng = int(pg - excess * suppress)
                    if ng > max(nr, nb):
                        ng = max(nr, nb)

                out_pixels[x, y] = (nr, ng, nb, a_byte)
                s += 1

    total = rw * rh
    print(f'Transparent: {t} ({t * 100 // total}%), '
          f'Semi: {s} ({s * 100 // total}%), '
          f'Opaque: {o} ({o * 100 // total}%)')

    # 5. Save as WebP
    if not dst:
        dst = src.rsplit('.', 1)[0] + '.webp'
    out.save(dst, 'WEBP', quality=90)
    print(f'Saved: {dst}')
    return dst


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    chroma_key(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else '')
