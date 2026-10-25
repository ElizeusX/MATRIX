#!/usr/bin/env python3
"""Build all non-pilot photo-guided drafts and explicit estimated AR manifests.

python -m pip install -r scripts/3d/requirements.txt
python scripts/3d/build_catalog_models.py --sync-web
Generated binaries are deployment artifacts; reproducible source is committed.
"""
import argparse
import json
import pathlib
import shutil
from catalog_profiles import profiles, ESTIMATED_WD
from catalog_surfaces import export, fabric

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'preview/models'


from photo_geometry import build_photo_model
from shape_profiles import shapes


def generate(output=OUT, sync_web=False, slugs=None):
    output=pathlib.Path(output);output.mkdir(parents=True,exist_ok=True)
    manifests=output.parent/'model-manifests';manifests.mkdir(parents=True,exist_ok=True)
    records=json.loads((ROOT/'data/catalog.json').read_text())['products'];specs=profiles();shape_specs=shapes();tex=fabric()
    assert set(shape_specs)==set(specs), "Every product needs an explicit shape profile"
    assert set(specs)=={p['slug'] for p in records if p['slug']!='hilton-2'}, 'Catalog profiles must cover every non-pilot product'
    count=ar_count=0
    for p in records:
        slug=p['slug']
        if slug=='hilton-2' or (slugs and slug not in slugs):continue
        profile={**specs[slug], 'shape':shape_specs[slug]};known=isinstance(p.get('width'),int) and isinstance(p.get('depth'),int)
        w,d=(p['width'],p['depth']) if known else ESTIMATED_WD[slug]
        assert 300<=w<=8000 and 300<=d<=6000
        h=profile['height']
        m=build_photo_model(profile,w/1000,d/1000,h/1000)
        m.finish((w/1000,h/1000,d/1000))
        extras=dict(product_slug=slug,approval='DRAFT_ONLY',accurate_AR=False,geometry_verified=False,
            room_measurement_allowed=False,dimensions_estimated=not known,height_m_UNVERIFIED=h/1000,
            source_catalog_width_mm=p.get('width'),source_catalog_depth_mm=p.get('depth'),
            shape_revision=2,reference_photo=profile['reference'],source_url=p['sourceUrl'],profile=profile,
            method='Authored photo-guided surfaces, not a scan or measured replica; original procedural fabric')
        size=export(m,output,slug,profile,extras,tex)
        manifest=dict(slug=slug,status='draft',enabled_3d=True,enabled_ar=known,
            geometry_verified=False,rights_confirmed=True,
            rights_basis='Original authored geometry and procedural textures; no photo pixels embedded',
            width_mm=p.get('width'),depth_mm=p.get('depth'),height_mm=None,
            estimated_width_mm=w,estimated_depth_mm=d,estimated_height_mm=h,
            dimensions_estimated=not known,preview_ar=known,
            height_estimate_source='Authored photo profile proportions; not a manufacturer measurement',
            shape_revision=2,camera_orbit=('-25deg 65deg auto' if profile['shape']['family']=='bed' else '-12deg 78deg auto' if profile['shape']['family']=='venera' else '-20deg 78deg auto'),glb_url=f'models/{slug}-v2-draft.glb',reference_photo=profile['reference'],
            blockers=['manufacturer_height','geometry_approval','device_ar_review'])
        if known:manifest['usdz_url']=f'models/{slug}-v2-estimated.usdz'
        else:manifest['blockers'].append('manufacturer_width_depth')
        (manifests/f'{slug}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        count+=1;ar_count+=known
        print(f'{slug}: {len(m.parts)} parts, {size//1024} KiB, '+('estimated AR' if known else '3D only; W/D estimated'),flush=True)
    if sync_web:
        for source,dest in [(output,ROOT/'apps/web/public/models'),(manifests,ROOT/'apps/web/public/model-manifests')]:
            dest.mkdir(parents=True,exist_ok=True)
            for f in source.iterdir():
                if f.suffix in ('.glb','.usdz','.json'):shutil.copy2(f,dest/f.name)
    print(f'Built {count} photo-guided drafts; {ar_count} estimated AR pairs; source dimensions unchanged.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path,default=OUT)
    parser.add_argument('--sync-web',action='store_true');parser.add_argument('--slug',action='append')
    args=parser.parse_args();generate(args.output,args.sync_web,args.slug)
