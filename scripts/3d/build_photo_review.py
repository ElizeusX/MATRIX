#!/usr/bin/env python3
"""Pair the reference photos with actual model-viewer canvas captures for review.
Run after test_catalog_viewers.cjs. This is visual evidence, not an accuracy score.
"""
import json
import pathlib
from PIL import Image,ImageChops,ImageDraw,ImageFont
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/3d'

def trimmed(path):
    im=Image.open(path).convert('RGBA');white=Image.new('RGBA',im.size,'white');white.alpha_composite(im);im=white.convert('RGB')
    mask=ImageChops.difference(im,Image.new('RGB',im.size,'white')).convert('L').point(lambda v:255 if v>14 else 0)
    box=mask.getbbox()
    if box:im=im.crop(box)
    im.thumbnail((760,460));return im


def main():
    reviews=json.loads((ROOT/'scripts/3d/photo_shape_review.json').read_text())['products']
    font=ImageFont.load_default(size=22);small=ImageFont.load_default(size=15)
    for slug,review in reviews.items():
        canvas=OUT/f'catalog-model-{slug}.png'
        if not canvas.exists():raise SystemExit('Missing browser capture: '+str(canvas))
        pair=Image.new('RGB',(1600,555),'white');draw=ImageDraw.Draw(pair)
        draw.text((20,14),slug,font=font,fill='#233128')
        for col,(label,path) in enumerate([('MANUFACTURER PHOTO',ROOT/'preview'/review['photo']),('REVISED 3D DRAFT',canvas)]):
            draw.text((col*800+20,48),label,font=small,fill='#71756e')
            im=trimmed(path);pair.paste(im,(col*800+(800-im.width)//2,85+(460-im.height)//2))
        pair.save(OUT/f'catalog-compare-{slug}.png')
    print('Created source-photo / actual WebGL comparison images for '+str(len(reviews))+' products.')

if __name__=='__main__':main()
