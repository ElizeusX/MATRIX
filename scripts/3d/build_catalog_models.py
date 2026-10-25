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
from catalog_surfaces import SurfaceModel, export, fabric

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'preview/models'


def add_seat(m,name,x,z,w,d,y=.43,mat=0):
    c=(x,y,z);size=(w,.17,d)
    m.panel(name,c,size,.052,.009,material=mat)
    m.seam(name+'_piping',c,size)


def add_back(m,name,x,w,z,h,style):
    bottom=.50; top=h-.025; height=top-bottom
    center=(x,(top+bottom)/2,z)
    # Broad compressed pads and recessed horizontal breaks remain visible in 3D.
    if style in ('headrest','grid'):
        for i,(cy,ch) in enumerate([(bottom+height*.30,height*.56),(bottom+height*.80,height*.36)]):
            cols=2 if style=='grid' else 1
            for j in range(cols):
                cw=w/cols-.014;cx=x-w/2+(j+.5)*w/cols
                m.panel(f'{name}_pad_{i}_{j}',(cx,cy,z),(cw,ch,.205),.045,.01,tilt=.16)
    else:
        m.panel(name,center,(w,height,.21),.05,.012,tilt=.14)
        m.seam(name+'_welt',center,(w,height,.21),'front')
        if style in ('tuft','diamond'):
            # Tuft seam channels and small upholstered buttons, not flat textures.
            if style=='tuft':
                m.line(name+'_horizontal',[(x-w*.45,bottom+height*.52,z+.107),(x+w*.45,bottom+height*.52,z+.107)],.0018)
                for k in (-.22,.22):
                    m.line(name+f'_vertical_{k}',[(x+w*k,bottom+.04,z+.103),(x+w*k,top-.04,z+.103)],.0017)
                    m.panel(name+f'_button_{k}',(x+w*k,bottom+height*.52,z+.109),(.014,.014,.008),.003,0,material=1)
            else:
                for k in (-1,0,1):
                    cx=x+k*w*.28
                    m.line(name+f'_diamond_a_{k}',[(cx-w*.2,bottom+.025,z+.106),(cx+w*.2,top-.025,z+.106)],.0019)
                    m.line(name+f'_diamond_b_{k}',[(cx+w*.2,bottom+.025,z+.106),(cx-w*.2,top-.025,z+.106)],.0019)


def sofa(profile,w,d,h):
    m=SurfaceModel();features=profile['features'];form=profile['form']
    armless='armless' in features;arm=.065 if armless else min(.25,w*.09)
    if 'round' in features:arm=min(.19,w*.08)
    inside=w-2*arm;count=profile['count'];sw=inside/count
    chaise=profile['chaise'];corners=({0,count-1} if chaise=='both' else {0} if chaise=='left' else {count-1} if chaise=='right' else set())
    main_depth=min(1.04,d) if corners else d
    rear=-d/2;front=rear+main_depth
    leg=.12 if 'feet' in features else .045
    seat_y=.43;seat_front=front-.055;seat_rear=rear+.25
    # Separate plinths preserve the empty floor in front of an L-shaped sofa.
    for i in range(count):
        x=-inside/2+sw*(i+.5);end=d/2 if i in corners else front
        depth=end-rear;z=(rear+end)/2
        m.panel(f'plinth_{i}',(x,(leg+.35)/2,z),(sw-.007,.35-leg,depth-.025),.035,.001,
                material=5 if 'contrast' in features else 0)
        if 'channels' in features or 'quilt' in features:
            channels=3 if 'channels' in features else 2
            for c in range(channels):
                cw=(sw-.03)/channels
                add_seat(m,f'seat_{i}_channel_{c}',x-sw/2+.015+cw*(c+.5),(seat_rear+end-.05)/2,cw-.012,end-.05-seat_rear)
        else:add_seat(m,f'seat_{i}',x,(seat_rear+end-.05)/2,sw-.025,end-.05-seat_rear)
        for zleg in (rear+.09,end-.10):
            for xleg in (x-sw/2+.08,x+sw/2-.08):
                m.panel(f'foot_{len(m.parts)}',(xleg,leg/2,zleg),(.045,leg,.045),.007,0,material=2)
        add_back(m,f'back_cushion_{i}',x,sw-.025,rear+.24,h,profile['back'])
    # A complete upholstered rear, plus arms with timber caps/shelves where visible.
    back_h=h-.12 if 'tall-back' in features else .70
    m.panel('rear_upholstery',(0,(back_h+leg)/2,rear+.075),(w-.06,back_h-leg,.15),.025,.001)
    for side in (-1,1):
        x=side*(w-arm)/2
        arm_end=d/2 if ((side<0 and 0 in corners) or (side>0 and count-1 in corners)) else front
        # Slim modern arms stop at the regular seat even beside an ottoman.
        if profile['chaise']!='both' and 'round' not in features:arm_end=front
        arm_depth=arm_end-rear;az=(arm_end+rear)/2
        if not armless:
            m.panel(f'arm_{side}',(x,(leg+.69)/2,az),(arm,.69-leg,arm_depth),.07 if 'round' in features else .025,.005,
                    material=5 if 'contrast' in features else 0)
            if any(f in features for f in ('wood','shelf','drawers')):
                m.panel(f'timber_cap_{side}',(x,.704,az),(arm+.008,.025,arm_depth-.015),.008,0,material=3)
            if 'shelf' in features:
                # Framed opening in the arm front, with recessed timber shelves.
                m.panel(f'shelf_inset_{side}',(x,.36,arm_end+.002),(arm*.70,.44,.018),.003,0,material=3)
                for sy in (.15,.38,.58):m.panel(f'shelf_edge_{side}_{sy}',(x,sy,arm_end+.017),(arm*.79,.022,.03),.003,0,material=5)
            if 'drawers' in features:
                for j in range(3):
                    y=.17+j*.16
                    m.panel(f'drawer_{side}_{j}',(x,y,arm_end+.007),(arm*.75,.14,.016),.004,0,material=3)
                    m.panel(f'handle_{side}_{j}',(x,y+.027,arm_end+.02),(arm*.4,.014,.014),.003,0,material=2)
            if 'cap' in features or 'capped' in features:
                m.panel(f'arm_pad_{side}',(x,.73,az),(arm+.025,.12,arm_depth+.015),.045,.008)
        if 'pillows' in features:
            m.panel(f'accent_pillow_{side}',(side*inside*.37,.66,rear+.47),(.31,.32,.13),.05,.017,tilt=-.25,material=4)
    if 'trim' in features:
        m.panel('front_trim',(0,.20,front-.006),(inside,.065,.024),.009,0,material=3)
    if 'tall-back' in features:
        for i in range(8):m.panel(f'headboard_tile_{i}',(-w/2+w*(i+.5)/8,h-.14,rear+.03),(w/8-.01,.25,.13),.015,.002)
    if 'return-back' in features:
        m.panel('chaise_return_back',(w/2-.09,.68,(front+d/2)/2),(.18,.45,d/2-front),.035,.008)
    if form=='chaise':
        # Delta's asymmetric curved upholstered back, traced as short padded spans.
        for i in range(12):
            x=-w*.46+i*w*.92/11;cy=.52+.19*(1-(x/(w*.51))**2)
            m.panel(f'curved_back_{i}',(x,cy,rear+.08),(w/11,.24,.15),.055,.006,material=5)
    return m


def bed(profile,w,d,h):
    m=SurfaceModel();daybed=profile['form']=='daybed';features=profile['features']
    rail=.09;floor=.06;top=.39
    for x in (-w/2+rail/2,w/2-rail/2):
        m.panel(f'side_rail_{len(m.parts)}',(x,(floor+top)/2,0),(rail,top-floor,d-.06),.024,.002)
    for z in (-d/2+rail/2,d/2-rail/2):
        m.panel(f'end_rail_{len(m.parts)}',(0,(floor+top)/2,z),(w,top-floor,rail),.025,.002)
    # Headboard follows the photo: full length for daybeds, short end for doubles.
    hw=w;z=-d/2+.06;style=profile['back'];n=profile['count']
    m.panel('headboard_structure',(0,(h+floor)/2,z),(hw,h-floor,.10),.02,.001)
    rows=4 if style=='horizontal' else 3 if style=='grid' else 1
    cols=n if style in ('vertical','grid') else 1
    for row in range(rows):
        for col in range(cols):
            ph=(h-.42)/rows-.009;pw=(hw-.07)/cols-.008
            c=(-hw/2+.035+(col+.5)*(hw-.07)/cols,.42+(row+.5)*(h-.42)/rows,z+.073)
            m.panel(f'headboard_pad_{row}_{col}',c,(pw,ph,.085),.019,.004)
    if style=='diamond':
        for i in range(3):
            x=(i-1)*hw*.28
            m.line(f'headboard_diamond_a_{i}',[(x-hw*.20,.45,z+.125),(x+hw*.20,h-.03,z+.125)],.003)
            m.line(f'headboard_diamond_b_{i}',[(x+hw*.20,.45,z+.125),(x-hw*.20,h-.03,z+.125)],.003)
    if daybed:m.panel('side_headboard',(-w/2+.04,(h+floor)/2,0),(.10,h-floor,d),.025,.002)
    if 'slats' in features:
        # An open slatted frame, as pictured; lifting mechanisms are not simulated.
        for j in range(18):
            sz=-d/2+.17+(d-.30)*(j+.5)/18
            m.panel(f'timber_slat_{j}',(0,.34,sz),(w-.22,.022,.055),.006,.001,material=3)
        m.panel('center_support',(0,.30,0),(.035,.055,d-.20),.005,0,material=2)
    else:
        m.panel('upholstered_sleep_surface',(0,.43,.045),(w-.15,.18,d-.23),.05,.009)
        m.seam('sleep_surface_welt',(0,.43,.045),(w-.15,.18,d-.23))
    for x in (-w/2+.12,w/2-.12):
        for zz in (-d/2+.13,d/2-.13):m.panel(f'foot_{len(m.parts)}',(x,.03,zz),(.075,.06,.075),.008,0,material=2)
    return m


def generate(output=OUT, sync_web=False, slugs=None):
    output=pathlib.Path(output);output.mkdir(parents=True,exist_ok=True)
    manifests=output.parent/'model-manifests';manifests.mkdir(parents=True,exist_ok=True)
    records=json.loads((ROOT/'data/catalog.json').read_text())['products'];specs=profiles();tex=fabric()
    assert set(specs)=={p['slug'] for p in records if p['slug']!='hilton-2'}, 'Catalog profiles must cover every non-pilot product'
    count=ar_count=0
    for p in records:
        slug=p['slug']
        if slug=='hilton-2' or (slugs and slug not in slugs):continue
        profile=specs[slug];known=isinstance(p.get('width'),int) and isinstance(p.get('depth'),int)
        w,d=(p['width'],p['depth']) if known else ESTIMATED_WD[slug]
        assert 300<=w<=8000 and 300<=d<=6000
        h=profile['height'];builder=bed if profile['form'] in ('bed','daybed') else sofa
        m=builder(profile,w/1000,d/1000,h/1000);m.segments=10
        m.finish((w/1000,h/1000,d/1000))
        extras=dict(product_slug=slug,approval='DRAFT_ONLY',accurate_AR=False,geometry_verified=False,
            room_measurement_allowed=False,dimensions_estimated=not known,height_m_UNVERIFIED=h/1000,
            source_catalog_width_mm=p.get('width'),source_catalog_depth_mm=p.get('depth'),
            reference_photo=profile['reference'],source_url=p['sourceUrl'],profile=profile,
            method='Authored photo-guided surfaces, not a scan or measured replica; original procedural fabric')
        size=export(m,output,slug,profile,extras,tex)
        manifest=dict(slug=slug,status='draft',enabled_3d=True,enabled_ar=known,
            geometry_verified=False,rights_confirmed=True,
            rights_basis='Original authored geometry and procedural textures; no photo pixels embedded',
            width_mm=p.get('width'),depth_mm=p.get('depth'),height_mm=None,
            estimated_width_mm=w,estimated_depth_mm=d,estimated_height_mm=h,
            dimensions_estimated=not known,preview_ar=known,
            height_estimate_source='Authored photo profile proportions; not a manufacturer measurement',
            glb_url=f'models/{slug}-draft.glb',reference_photo=profile['reference'],
            blockers=['manufacturer_height','geometry_approval','device_ar_review'])
        if known:manifest['usdz_url']=f'models/{slug}-estimated.usdz'
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
