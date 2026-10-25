"""Continuous sewn upholstery surfaces. Channels deform a shell; they do not
split cushions into disconnected boxes. All shape values remain authored estimates.
"""
import math
import numpy as np
from catalog_surfaces import SurfaceModel


class UpholsteryModel(SurfaceModel):
    def upholstery(self,name,center,size,radius=.045,bulge=.012,tilt=0,
                   material=0,front_grid=None,seat_grid=None,diamond=False,
                   pillow=False,piping=False,top_piping=False,roll=0,taper=0,segments=22):
        half=np.array(size,dtype=float)/2
        radius=min(radius,min(half)*.92)
        core=half-radius
        rotation=np.array([[math.cos(roll),-math.sin(roll),0],
                           [math.sin(roll),math.cos(roll),0],[0,0,1.]])
        def groove(coords,extent,count,spread=.012):
            if count<=1:return np.zeros(len(coords))
            seams=np.linspace(-extent,extent,count+1)[1:-1]
            return np.exp(-(np.min(abs(coords[:,None]-seams),axis=1)/spread)**2)
        def map_points(raw):
            near=np.clip(raw,-core,core);delta=raw-near
            normals=delta/np.maximum(np.linalg.norm(delta,axis=1)[:,None],1e-12)
            p=near+radius*normals
            x,y,z=p.T.copy();qx=np.clip(x/half[0],-1,1);qy=np.clip(y/half[1],-1,1);qz=np.clip(z/half[2],-1,1)
            front=np.clip(normals[:,2],0,1);top=np.clip(normals[:,1],0,1)
            front_bump=(1-qx*qx)*(1-qy*qy)
            top_bump=(1-qx*qx)*(1-qz*qz)
            p[:,2]+=front*bulge*front_bump
            p[:,1]+=top*min(.013,bulge*.45)*top_bump
            if pillow:
                # Thin sewn perimeter, fuller centre, pinched sides and relaxed top.
                puff=np.maximum(0,(1-qx*qx)*(1-qy*qy))**.7
                p[:,2]=z*(.28+.82*puff)
                p[:,0]*=1-.024*(1-qy*qy)
                p[:,1]-=.013*np.clip(qy,0,1)*(1-qx*qx)
                rim=np.exp(-((1-abs(qx))/.13)**2)+np.exp(-((1-abs(qy))/.13)**2)
                p[:,2]+=np.sign(z)*.0022*np.sin(x*75+y*45)*rim*np.maximum(0,1-abs(qx*qy))
            if front_grid:
                cols,rows,depth=front_grid
                lines=np.maximum(groove(x,half[0],cols),groove(y,half[1],rows))
                # Full fabric shell is compressed at stitched lines/intersections.
                weight=np.maximum(0,(1-abs(qx)**8)*(1-abs(qy)**8))
                p[:,2]-=front*depth*lines*weight
                for tx in np.linspace(-half[0],half[0],cols+1)[1:-1]:
                    for ty in np.linspace(-half[1],half[1],rows+1)[1:-1]:
                        dx=x-tx;dy=y-ty;r=np.hypot(dx,dy)
                        p[:,2]-=front*.011*np.exp(-(r/.046)**2)
                        p[:,2]+=front*.0028*np.sin(np.arctan2(dy,dx)*10+r*75)*np.exp(-(r/.10)**2)*weight
            if seat_grid:
                cols,rows,depth=seat_grid
                vertical=groove(x,half[0],cols,.010)
                transverse=groove(z,half[2],rows,.012)
                p[:,1]-=top*depth*np.maximum(vertical,transverse)
                p[:,2]-=front*depth*vertical
            if diamond:
                period=min(.45,size[0]/2)
                for coords,mask,axis in [(y,front,2),(z,top,1)]:
                    a=(x+coords)/math.sqrt(2);b=(x-coords)/math.sqrt(2)
                    da=abs((a+period/2)%period-period/2)
                    db=abs((b+period/2)%period-period/2)
                    p[:,axis]-=mask*.012*np.exp(-(np.minimum(da,db)/.009)**2)
            if taper:p[:,0]*=1+taper*qy
            p[:,2]-=tilt*p[:,1]
            return p@rotation.T+center
        verts=[];uv=[];faces=[]
        # Matching surface sampling on shared edges avoids gaps at rounded corners.
        n=segments
        for axis in range(3):
            axes=[a for a in range(3) if a!=axis]
            for sign in (-1,1):
                start=len(verts)
                # Concentrate samples at the stitched lines, so channels are geometric.
                def samples(a):
                    base=np.linspace(-half[a],half[a],n+1)
                    count=0
                    if front_grid and a in (0,1):count=front_grid[a]
                    if seat_grid and a==0:count=max(count,seat_grid[0])
                    if seat_grid and a==2:count=seat_grid[1]
                    if count>1:
                        marks=np.linspace(-half[a],half[a],count+1)[1:-1]
                        base=np.r_[base,marks,marks-.012,marks+.012]
                    return np.unique(np.clip(base,-half[a],half[a]))
                aa,bb=samples(axes[0]),samples(axes[1]);u,v=np.meshgrid(aa,bb)
                raw=np.zeros((u.size,3));raw[:,axis]=sign*half[axis];raw[:,axes[0]]=u.ravel();raw[:,axes[1]]=v.ravel()
                points=map_points(raw);verts.extend(points)
                uv.extend(zip((u.ravel()+half[axes[0]])*2.2,(v.ravel()+half[axes[1]])*2.2))
                for j in range(len(bb)-1):
                    for i in range(len(aa)-1):
                        a=start+j*len(aa)+i;b=a+1;c=a+len(aa);d=c+1
                        # Orientation follows the axis permutation, independent of sculpting.
                        positive=(1 if axis in (0,2) else -1)*sign>0
                        faces.extend([(a,b,d),(a,d,c)] if positive else [(a,d,b),(a,c,d)])
        self.parts.append([name,np.asarray(verts),np.asarray(faces,dtype=np.uint32),np.asarray(uv),material])
        if piping:
            # Sample the same actual shell surface instead of drawing a flat rectangle.
            inset=radius*.48;rx=half[0]-inset;ry=half[1]-inset;r=min(.018,rx*.1,ry*.1)
            points=[]
            for sx,sy,start_angle in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
                for angle in np.linspace(start_angle,start_angle+90,7):
                    t=math.radians(angle);points.append((sx*(rx-r)+r*math.cos(t),sy*(ry-r)+r*math.sin(t),half[2]))
            points.append(points[0]);self.line(name+'_sewn_edge',map_points(np.asarray(points)),.0015,1)
        if top_piping:
            inset=radius*.50;rx=half[0]-inset;rz=half[2]-inset;r=min(.018,rx*.1,rz*.1)
            points=[]
            for sx,sz,start_angle in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
                for angle in np.linspace(start_angle,start_angle+90,8):
                    t=math.radians(angle);points.append((sx*(rx-r)+r*math.cos(t),half[1],sz*(rz-r)+r*math.sin(t)))
            points.append(points[0]);self.line(name+'_top_welt',map_points(np.asarray(points)),.0014,1)

    def foot(self,name,center,height,splayed=False,material=2):
        self.panel(name,center,(.055,height,.055),.009,0,material=material)
        if splayed:
            p=self.parts[-1][1];x,y,z=center
            t=(y+height/2-p[:,1])/height
            p[:,0]+=np.sign(x)*t*.025;p[:,2]+=np.sign(z)*t*.018
            p[:,0]=x+(p[:,0]-x)*(1-t*.38)
            p[:,2]=z+(p[:,2]-z)*(1-t*.38)

    def curved_back(self,name,xs,heights,z,thickness,base=.34,material=0):
        # A single closed swept shell for Delta's asymmetric silhouette.
        xs=np.asarray(xs);heights=np.asarray(heights);verts=[];uv=[];faces=[]
        n=96;xx=np.linspace(xs[0],xs[-1],n+1)
        # Smooth monotone piecewise cubic interpolation without a SciPy dependency.
        slopes=np.gradient(heights,xs)
        for side in (-1,1):
            for x in xx:
                k=min(np.searchsorted(xs,x,side='right')-1,len(xs)-2);k=max(k,0)
                length=xs[k+1]-xs[k];t=(x-xs[k])/length
                h=(2*t**3-3*t*t+1)*heights[k]+(t**3-2*t*t+t)*length*slopes[k]+(-2*t**3+3*t*t)*heights[k+1]+(t**3-t*t)*length*slopes[k+1]
                for row in range(9):
                    q=row/8;y=base+(h-base)*q
                    zz=z+side*thickness/2+.012*math.sin(math.pi*q)
                    verts.append((x,y,zz));uv.append((x*2,y*2))
        span=(n+1)*9
        for side in (0,1):
            for i in range(n):
                for j in range(8):
                    a=side*span+i*9+j;b=a+9
                    faces.extend([(a,b,b+1),(a,b+1,a+1)] if side==1 else [(a,b+1,b),(a,a+1,b+1)])
        for i in range(n):
            for j in (0,8):
                a=i*9+j;b=(i+1)*9+j;c=span+b;d=span+a
                faces.extend([(a,b,c),(a,c,d)] if j==8 else [(a,c,b),(a,d,c)])
        for i in (0,n):
            for j in range(8):
                a=i*9+j;b=a+1;c=span+b;d=span+a
                faces.extend([(a,b,c),(a,c,d)] if i==0 else [(a,c,b),(a,d,c)])
        self.parts.append([name,np.asarray(verts),np.asarray(faces,dtype=np.uint32),np.asarray(uv),material])
