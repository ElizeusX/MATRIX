"""Photo-specific construction families, rather than a universal sofa assembly."""
import math
import numpy as np
from upholstery_shapes import UpholsteryModel
from shape_profiles import shapes


def layout(profile,s,w,d):
    inner=w-2*s['arm'];n=s['seat_modules'];cw=min(s['chaise_width'],inner*.46)
    side=profile['chaise'];regular=min(d,s['depth'])
    if s['family']=='hilton-return':
        right=.85;lengths=[cw,inner-cw-right,right]
        depths=[d,regular,min(d,regular+.22)]
    elif side=='both':
        lengths=[cw,inner-2*cw,cw];depths=[d,regular,d]
    elif side in ('left','right') and cw:
        rest=max(1,n-1);lengths=[cw]+[(inner-cw)/rest]*rest;depths=[d]+[regular]*rest
        if side=='right':lengths.reverse();depths.reverse()
    else:lengths=[inner/n]*n;depths=[regular]*n
    pos=-inner/2;result=[]
    for width,depth in zip(lengths,depths):
        result.append((pos+width/2,width,depth));pos+=width
    return result


def back_cushions(m,profile,s,inside,rear,h):
    count=s['back_count'];span=inside*s.get('back_span',1)
    offset=inside*s.get('back_align',0);z=rear+.24;bottom=s['seat']-.012
    if s['family']=='hilton-return':span=inside-.85;offset=-.425
    width=span/count;height=h-bottom-.012
    if s.get('tall_back'):height=min(.44,height)
    for i in range(count):
        x=offset-span/2+(i+.5)*width;cw=width-.012;cy=bottom+height/2
        kind=s['back'];grid=s.get('grid')
        if kind=='tuft':grid=(3,2,.020)
        if kind=='fold':grid=(1,2,.016)
        loose=kind in ('pillow','tuft','lumbar')
        m.upholstery(f'back_shell_{i}',(x,cy,z),(cw,height,.225),.025 if loose else .04,
            .035 if loose else .020,tilt=.22 if loose else .17,material=6,
            front_grid=grid,front_offset=.07 if kind=='fold' else 0,diamond=kind=='diamond',pillow=loose,
            roll=(.018 if i%2==0 else -.012) if loose else 0,
            piping=s.get('welt',False),segments=24)
        if kind=='straps':
            for j,px in enumerate((x-cw/6,x+cw/6)):
                ys=np.linspace(bottom+.02,bottom+height-.02,20)
                pts=[(px,y,z+.115-.17*(y-cy)) for y in ys]
                m.line(f'back_strap_{i}_{j}',pts,.0075,1)
            xs=np.linspace(x-cw/2+.025,x+cw/2-.025,30)
            m.line(f'back_cross_strap_{i}',[(xx,cy,z+.111) for xx in xs],.0075,1)
    if s['back']=='lumbar':
        for i in range(count*2):
            x=-inside/2+(i+.5)*inside/(count*2)
            m.upholstery(f'lumbar_pillow_{i}',(x,s['seat']+.125,rear+.42),
                (inside/(count*2)-.012,.265,.14),.021,.022,pillow=True,tilt=.08,material=6,segments=18)
    if s.get('loose_front'):
        for i,side in enumerate((-1,1)):
            m.upholstery(f'loose_front_pillow_{i}',(side*inside*.29,s['seat']+.18,rear+.50),
                (.42,.38,.16),.021,.026,pillow=True,tilt=.10,roll=side*-.13,material=6,piping=True)


def shelf_arm(m,s,side,w,rear,front):
    # The source shelf opens on the long OUTER side of the left arm.
    aw=s['arm'];outer=side*w/2;inner=outer-side*(aw-.018);z=(rear+front)/2;depth=front-rear
    m.panel('shelf_inner_wall',(inner,.34,z),(.025,.57,depth-.025),.005,0,material=3)
    for zz in (rear+.025,front-.025):
        m.panel(f'shelf_end_{zz}',(side*(w-aw)/2,.34,zz),(aw,.57,.05),.007,0)
    for yy in (.09,.36,.61):
        m.panel(f'shelf_horizontal_{yy}',(side*(w-aw)/2,yy,z),(aw,.028,depth-.05),.004,0,material=3)
    m.panel('shelf_vertical_divider',(side*(w-aw)/2,.35,z),(aw,.48,.025),.003,0,material=3)


def sofa(profile,s,w,d,h):
    m=UpholsteryModel();inner=w-2*s['arm'];rear=-d/2;regular=min(d,s['depth']);front=rear+regular
    modules=layout(profile,s,w,d);floor=s['feet'];seat=s['seat'];thick=s['thickness']
    if s.get('continuous_base') and profile['chaise']=='none':
        m.panel('continuous_underframe',(0,(floor+seat-thick)/2,(rear+front)/2),
            (inner,seat-thick-floor,regular-.015),.025,.002,material=5)
    for i,(x,width,depth) in enumerate(modules):
        end=rear+depth;seat_start=rear+.20;sz=(seat_start+end)/2
        if s.get('continuous_base') and profile['chaise']!='none':
            m.upholstery(f'underframe_{i}',(x,(floor+seat-thick)/2,(rear+end)/2),
                (width-.006,seat-thick-floor,depth-.015),.022,.001,material=5,
                plan_radius=.23 if s.get('round_chaise') and depth>regular+.1 else 0,segments=14)
        if not s.get('continuous_base'):
            thick=seat-floor-.006
        cells=s.get('seat_channels',0)
        m.upholstery(f'seat_shell_{i}',(x,seat-thick/2,sz),(width-.009,thick,end-seat_start-.012),
            min(s.get('seat_radius',s['radius']),.075),.010,seat_grid=(cells,s.get('seat_rows',2 if cells else 0),.009) if cells else None,
            diamond=s.get('diamond',False),piping=s['family']=='loft',top_piping=s['family']=='venera',
            plan_radius=.23 if s.get('round_chaise') and depth>regular+.1 else 0,segments=22)
    # Hide the supporting rear below the photographed cushion outline.
    support_h=min(s['arm_h']+.035,h-.16)
    m.panel('rear_support',(0,(floor+support_h)/2,rear+.060),(w-.035,support_h-floor,.12),.025,.001)
    for side in (-1,1):
        if s['arm']==0:continue
        aw=s['arm'];x=side*(w-aw)/2;end=rear+regular*.50 if s['family']=='rotating' else front
        if s['family']=='hilton-return' and side==1:end=min(d/2,front+.22)
        arm_depth=end-rear;az=(end+rear)/2
        if s.get('shelves') and side==-1:
            shelf_arm(m,s,side,w,rear,end)
        elif s.get('stepped'):
            m.upholstery(f'arm_lower_{side}',(x,(floor+seat)/2,az),(aw,seat-floor,arm_depth),.025,.003,material=5)
            upper=.17;ux=side*(w-upper)/2
            m.upholstery(f'arm_upper_{side}',(ux,(seat+s['arm_h'])/2,az),
                (upper,s['arm_h']-seat,arm_depth),.020,.002,material=5)
        else:
            m.upholstery(f'arm_shell_{side}',(x,(floor+s['arm_h'])/2,az),
                (aw,s['arm_h']-floor,arm_depth),s['radius'],.005,
                front_grid=(1,2,.006) if s.get('arm_grid') else None,
                taper=s.get('taper',0),piping=s.get('welt',False),segments=16)
        if s.get('wood') or s.get('stepped'):
            m.panel(f'arm_cap_{side}',(x,s['arm_h']+.012,az),(aw+.005,.025,arm_depth),.005,0,material=3)
        if s.get('drawers'):
            for j in range(3):
                y=.16+j*.17
                m.panel(f'drawer_front_{side}_{j}',(x,y,end+.003),(aw*.86,.153,.014),.003,0,material=3)
                m.panel(f'drawer_handle_{side}_{j}',(x,y+.038,end+.015),(aw*.42,.018,.012),.003,0,material=2)
    back_cushions(m,profile,s,inner,rear,h)
    if s.get('return_back'):
        side=1;return_depth=max(.45,(min(d,regular+.22) if s['family']=='hilton-return' else d)-.40)
        count=2 if s['family']=='hilton-return' else 1
        for i in range(count):
            z=rear+.22+(i+.5)*return_depth/count
            # Build a cushion facing +Z, then rotate it to face into the corner (-X).
            x=w/2-s['arm']-.075;height=h-s['seat']-.025
            angle=math.radians(55 if s['family']=='hilton-return' else 90)
            if s['family']=='hilton-return':
                length=return_depth/count
                x=inner/2-.85+math.cos(angle)*(i+.5)*length
                z=rear+.24+math.sin(angle)*(i+.5)*length
            before=len(m.parts)
            m.upholstery(f'return_back_shell_{i}',(0,(s['seat']+h)/2,0),
                (return_depth/count-.012,height,.20),.035,.020,
                front_grid=(1,2,.014) if s['family']=='hilton-return' else (2,2,.010),
                front_offset=.07 if s['family']=='hilton-return' else 0,
                tilt=.22,material=6,segments=22)
            part=m.parts[before];p=part[1].copy()
            part[1][:,0]=x+math.cos(angle)*p[:,0]-math.sin(angle)*p[:,2]
            part[1][:,2]=z+math.sin(angle)*p[:,0]+math.cos(angle)*p[:,2]
    if s.get('trim'):
        for i,(x,width,depth) in enumerate(modules):
            m.panel(f'front_timber_band_{i}',(x,seat-thick-.02,rear+depth-.003),(width,.065,.018),.004,0,material=3)
    if s.get('tall_back'):
        m.upholstery('tall_headboard',(0,(floor+h)/2,rear+.04),(w,h-floor,.10),.015,.002,
            front_grid=(8,3,.006),material=5,segments=18)
    if floor>.001:
        foot_positions=set()
        for x,width,depth in modules:
            for xx in (x-width/2+.09,x+width/2-.09):
                for zz in (rear+.12,rear+depth-.11):foot_positions.add((round(xx,3),round(zz,3)))
        # One common underframe has corner feet and a discreet central support pair.
        if profile['chaise']=='none':
            foot_positions={(x,z) for x in (-inner/2+.10,inner/2-.10,0) for z in (rear+.13,front-.12)}
        for i,(x,z) in enumerate(sorted(foot_positions)):
            m.foot(f'foot_{i}',(x,floor/2,z),floor,s.get('splayed',False))
    accents=s.get('accent',0)
    for i in range(accents):
        side=-1 if i==0 else 1
        m.upholstery(f'accent_pillow_{i}',(side*inner*.38,seat+.15,rear+.47),
            (.29,.30,.12),.018,.025,pillow=True,roll=side*-.11,material=4,segments=20)
    return m


def bed(profile,s,w,d,h):
    m=UpholsteryModel();daybed=s.get('daybed',False);floor=.055;top=.34;rail=.10
    cols,rows=s.get('bed_cols',6),s.get('bed_rows',3)
    for side in (-1,1):
        m.upholstery(f'side_rail_{side}',(side*(w-rail)/2,(floor+top)/2,0),
            (rail,top-floor,d-.06),.023,.003,material=0,segments=12)
    for side in (-1,1):
        m.upholstery(f'end_rail_{side}',(0,(floor+top)/2,side*(d-rail)/2),
            (w,top-floor,rail),.023,.003,front_grid=(cols,1,.004) if s.get('rail_channels') else None,segments=16)
    board_bottom=.04;board_height=h-board_bottom;z=-d/2+.055
    pattern=s.get('bed_pattern');grid=None if pattern=='diamond' else (cols,rows,.008)
    shell_map=m.upholstery('headboard_shell',(0,(h+board_bottom)/2,z),(w,board_height,.13),.021,.008,
        front_grid=grid,diamond=pattern=='diamond',material=0,segments=36 if pattern=='diamond' else 26)
    if pattern=='diamond':
        # Dark sewn channels follow the actual depressed headboard surface.
        period=min(.45,w/2);hy=board_height/2;hx=w/2
        shell=m.parts[-1];triangles=shell[1][shell[2]]
        normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
        triangles=triangles[normals[:,2]>1e-10]
        a,b,c=triangles[:,0],triangles[:,1],triangles[:,2]
        denominator=(b[:,1]-c[:,1])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,1]-c[:,1])
        valid=abs(denominator)>1e-12
        a,b,c,denominator=a[valid],b[valid],c[valid],denominator[valid]
        def on_rendered_surface(points):
            # Stitch centres follow the tessellated face, so seams remain visible
            # instead of falling below its linearly interpolated triangles.
            result=shell_map(np.asarray(points))
            for point in result:
                u=((b[:,1]-c[:,1])*(point[0]-c[:,0])+(c[:,0]-b[:,0])*(point[1]-c[:,1]))/denominator
                v=((c[:,1]-a[:,1])*(point[0]-c[:,0])+(a[:,0]-c[:,0])*(point[1]-c[:,1]))/denominator
                inside=(u>=-1e-6)&(v>=-1e-6)&(u+v<=1+1e-6)
                if inside.any():point[2]=np.max(u[inside]*a[inside,2]+v[inside]*b[inside,2]+(1-u[inside]-v[inside])*c[inside,2])+.0007
            return result
        for direction in (-1,1):
            for k in range(-4,5):
                points=[]
                for yy in np.linspace(-hy+.025,hy-.025,120):
                    xx=direction*yy+k*period*math.sqrt(2)
                    if -hx+.025<=xx<=hx-.025:points.append((xx,yy,.065))
                if len(points)>1:m.line(f'headboard_diagonal_stitch_{direction}_{k}',on_rendered_surface(points),.0018,1)
    # The photographed daybed return is at the right end, with matching padding.
    if daybed:
        before=len(m.parts)
        m.upholstery('daybed_right_return',(0,(h+board_bottom)/2,0),
            (d-.10,board_height,.13),.021,.008,front_grid=(max(3,round(cols*d/w)),rows,.008),segments=24)
        part=m.parts[before];pts=part[1].copy();part[1][:,0]=w/2-.055-pts[:,2];part[1][:,2]=pts[:,0]
    open_frame='slats' in profile['features']
    if open_frame:
        # Slats span the short direction, including two split rows for double beds.
        long=w if daybed else d;short=d if daybed else w
        for row in range(18):
            offset=-long/2+.16+(long-.30)*(row+.5)/18
            halves=1 if daybed else 2
            for half in range(halves):
                span=(short-.22)/halves-.02;cross=(half-(halves-1)/2)*(short-.22)/halves
                c=(offset,.31,cross) if daybed else (cross,.31,offset)
                size=(.045,.022,span) if daybed else (span,.022,.045)
                m.panel(f'bowed_slat_{row}_{half}',c,size,.005,.002,material=3)
        csize=(w-.20,.05,.035) if daybed else (.035,.05,d-.20)
        m.panel('slat_center_beam',(0,.28,0),csize,.004,0,material=2)
    else:
        m.upholstery('fitted_mattress',(0,.415,.04),(w-.10,.17,d-.17),.038,.009,segments=20)
    for i,(x,z) in enumerate(( (x,z) for x in (-w/2+.13,w/2-.13) for z in (-d/2+.13,d/2-.13))):
        m.panel(f'chrome_foot_{i}',(x,floor/2,z),(.085,floor,.075),.006,0,material=2)
    return m


def delta(profile,s,w,d,h):
    m=UpholsteryModel()
    m.panel('continuous_plinth',(0,.14,0),(w,.28,d-.015),.018,.001,material=5)
    m.upholstery('continuous_chaise_seat',(0,.37,.015),(w,.24,d-.025),.045,.009,
        seat_grid=(4,2,.006),segments=24)
    rear=-d/2+.035
    m.curved_back('low_lavender_sweep',[-w/2,-w*.28,0],[.45,.65,.61],rear,.07,material=0)
    m.curved_back('high_violet_sweep',[0,w*.18,w*.40,w/2],[.61,h,.77,.49],rear,.07,material=6)
    # A continuous rounded right-end return, not a row of raised blocks.
    m.curved_back('right_end_sweep',[-d/2,d*.05,d/2],[.49,.46,.43],0,.07,material=6)
    p=m.parts[-1][1].copy();m.parts[-1][1][:,0]=w/2-.060-p[:,2]-.035*((p[:,0]+d/2)/d)**2;m.parts[-1][1][:,2]=p[:,0]
    m.upholstery('loose_lavender_pillow',(w*.27,.62,rear+.11),(.38,.34,.13),.020,.028,
        pillow=True,roll=.08,piping=True,material=4,segments=24)
    return m


def build_photo_model(profile,w,d,h):
    s=profile['shape']
    if s['family']=='bed':return bed(profile,s,w,d,h)
    if s['family']=='delta':return delta(profile,s,w,d,h)
    return sofa(profile,s,w,d,h)
