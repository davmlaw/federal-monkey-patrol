// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:52 2005
// Last modified: Tue May 31 23:57:52 2005

// Some code from:
// Slickworm, copyright notice:
//     Quadtree Terrain Engine - Technical demo
//     Copyright (C) 2002 Micheál O'Brien
// Code taken from Mark Morley's Frustum Culling tutorial.
// Code (C) 2000 Mark Morley.
// Cube test changed to AABB test by MOB.

#include "graphics/3d/collision/aabb.h"
#include "graphics/3d/collision/frustum.h"
#include "graphics/3d/collision/sphere.h"
#include "graphics/display.h"
#include <iostream>
#include <math.h>

using namespace std;

Frustum::Frustum(const matrix44& view, const matrix44& prj)
{
    //cout << "Frustum()\n";
    ExtractFrustum(view, prj);
}


intersection_t Frustum::visit(AABB* bb)
{
    float* aabb = bb->aabb;

    for( int p = 0; p < 6; p++ ) {
	int outside = 0;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[4] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[4] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[4] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[4] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[5] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[5] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[5] + frustum[p][3] <= 0 )
	    outside++;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[5] + frustum[p][3] <= 0 )
	    outside++;
	
	if( outside ) {
	    if( p < 5 ) // don't do if already checked all
		return AABBIntersectFrustum(aabb);
	    else
		return INTERSECTING;
	}
    }
    
    return INSIDE;
}


intersection_t Frustum::visit(Frustum* bb)
{
//    cout << "Frustum" << "<-->" << "Frustum" << endl;
    return INSIDE;
}


intersection_t Frustum::visit(Sphere* bb)
{
    //int clip_result = INSIDE;
    GLfloat dist;
	
    for( int p = 0; p < 6; p++ ) {
	dist = frustum[p][0] * bb->position.x
	    +  frustum[p][1] * bb->position.y
	    +  frustum[p][2] * bb->position.z
	    +  frustum[p][3];
	if( dist <= -bb->radius ) {
	    return OUTSIDE;
	}// else if( dist <= radius )
	//	clip_result = INTERSECTING;
    }
    
    return INSIDE;

    //return clip_result;
}


intersection_t Frustum::intersects(bvVisitor* v) {
    return v->visit(this);
}



void Frustum::ExtractFrustum(const matrix44& view, const matrix44& prj)
{
    float clip[16];
    convert_mtx_to_glmatrix( matrix44(prj * view), clip );

    // Extract the RIGHT plane
    frustum[0][0] = clip[ 3] - clip[ 0];
    frustum[0][1] = clip[ 7] - clip[ 4];
    frustum[0][2] = clip[11] - clip[ 8];
    frustum[0][3] = clip[15] - clip[12];

    float t = 1.0f / (float)sqrt( frustum[0][0] * frustum[0][0] +
				  frustum[0][1] * frustum[0][1] +
				  frustum[0][2] * frustum[0][2] );
    frustum[0][0] *= t;
    frustum[0][1] *= t;
    frustum[0][2] *= t;
    frustum[0][3] *= t;

    // Extract the LEFT plane
    frustum[1][0] = clip[ 3] + clip[ 0];
    frustum[1][1] = clip[ 7] + clip[ 4];
    frustum[1][2] = clip[11] + clip[ 8];
    frustum[1][3] = clip[15] + clip[12];

    t = 1.0f / sqrt( frustum[1][0] * frustum[1][0] +
		     frustum[1][1] * frustum[1][1] +
		     frustum[1][2] * frustum[1][2] );
    frustum[1][0] *= t;
    frustum[1][1] *= t;
    frustum[1][2] *= t;
    frustum[1][3] *= t;

    // Extract the BOTTOM plane
    frustum[2][0] = clip[ 3] + clip[ 1];
    frustum[2][1] = clip[ 7] + clip[ 5];
    frustum[2][2] = clip[11] + clip[ 9];
    frustum[2][3] = clip[15] + clip[13];
    
    t = 1.0f / sqrt( frustum[2][0] * frustum[2][0] +
		     frustum[2][1] * frustum[2][1] +
		     frustum[2][2] * frustum[2][2] );
    frustum[2][0] *= t;
    frustum[2][1] *= t;
    frustum[2][2] *= t;
    frustum[2][3] *= t;

    // Extract the TOP plane
    frustum[3][0] = clip[ 3] - clip[ 1];
    frustum[3][1] = clip[ 7] - clip[ 5];
    frustum[3][2] = clip[11] - clip[ 9];
    frustum[3][3] = clip[15] - clip[13];

    t = 1.0f / sqrt( frustum[3][0] * frustum[3][0] +
		     frustum[3][1] * frustum[3][1] +
		     frustum[3][2] * frustum[3][2] );
    frustum[3][0] *= t;
    frustum[3][1] *= t;
    frustum[3][2] *= t;
    frustum[3][3] *= t;

    // Extract the FAR plane
    frustum[4][0] = clip[ 3] - clip[ 2];
    frustum[4][1] = clip[ 7] - clip[ 6];
    frustum[4][2] = clip[11] - clip[10];
    frustum[4][3] = clip[15] - clip[14];
	
    t = 1.0f / sqrt( frustum[4][0] * frustum[4][0] +
		     frustum[4][1] * frustum[4][1] +
		     frustum[4][2] * frustum[4][2] );
    frustum[4][0] *= t;
    frustum[4][1] *= t;
    frustum[4][2] *= t;
    frustum[4][3] *= t;
    
    // Extract the NEAR plane
    frustum[5][0] = clip[ 3] + clip[ 2];
    frustum[5][1] = clip[ 7] + clip[ 6];
    frustum[5][2] = clip[11] + clip[10];
    frustum[5][3] = clip[15] + clip[14];
    
    t = 1.0f / sqrt( frustum[5][0] * frustum[5][0] +
		     frustum[5][1] * frustum[5][1] +
		     frustum[5][2] * frustum[5][2] );
    frustum[5][0] *= t;
    frustum[5][1] *= t;
    frustum[5][2] *= t;
    frustum[5][3] *= t;
}


// This does a quicker check to see if AABB is fully outside frustum
// only called once we already have 1 point outside.

// Returns OUTSIDE or INTERSECTING (ie no INSIDE_FRUSTUM)
intersection_t Frustum::AABBIntersectFrustum(const float* aabb)
{

    for( int p = 0 ; p < 6; ++p ) {
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[4] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[4] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[4] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[4] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[5] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[2] +
	    frustum[p][2] * aabb[5] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[0] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[5] + frustum[p][3] > 0 )
	    continue;
	if( frustum[p][0] * aabb[1] + frustum[p][1] * aabb[3] +
	    frustum[p][2] * aabb[5] + frustum[p][3] > 0 )
	    continue;
	
	return OUTSIDE;
    }
    
    return INTERSECTING;

}


#if 0
bool PointInFrustum(vector3 point)
{
    int p;

    for( p = 0; p < 6; p++ )
    {
        if( frustum[p][0] * point.x
	    + frustum[p][1] * point.y
	    + frustum[p][2] * point.z
	    + frustum[p][3] <= 0 )
        {
            return false;
        }
    }
    return true;
}
#endif 
