// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:49 2005
// Last modified: Tue May 31 23:57:49 2005

#include "graphics/3d/collision/aabb.h"
#include "graphics/3d/collision/frustum.h"
#include "graphics/3d/collision/sphere.h"
#include <iostream>

using namespace std;


intersection_t Sphere::visit(AABB* bb)
{
    cout << "Sphere" << "<-->" << "AABB" << endl;
    return INSIDE;
}


intersection_t Sphere::visit(Frustum* bb)
{
    cout << "Sphere" << "<-->" << "Frustum" << endl;
    return INSIDE;
}


intersection_t Sphere::visit(Sphere* bb)
{
    vector3 dist = position - bb->position;
    float sum = dist.x + dist.y + dist.z;
    float r = radius + bb->radius;
    if( sum * sum <= r * r )
	return INSIDE;
    
    return OUTSIDE;
}


intersection_t Sphere::intersects(bvVisitor* v) {
    return v->visit(this);
}

