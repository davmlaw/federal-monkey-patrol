// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:46 2005
// Last modified: Tue May 31 23:57:46 2005

#include "graphics/3d/collision/aabb.h"
#include "graphics/3d/collision/frustum.h"
#include "graphics/3d/collision/sphere.h"
#include <iostream>

using namespace std;


AABB::AABB(const vector3& pos, const vector3& dim):
    dimensions(dim)
{
    setPosition(pos);
}

AABB::AABB(const vector3& dim):
    dimensions(dim)
{
    setPosition( vector3(0.0f, 0.0f, 0.0f) );
}


void AABB::setPosition(const vector3& pos)
{
    position = pos;
    recalculateArray();
}


void AABB::recalculateArray()
{
    vector3 halfdim = dimensions / 2;
    vector3 tfr = position + halfdim; // top far right
    vector3 bnl = position - halfdim; // bottom near left

    aabb[0] = bnl.x;
    aabb[2] = bnl.y;
    aabb[4] = bnl.z;

    aabb[1] = tfr.x;
    aabb[3] = tfr.y;
    aabb[5] = tfr.z;
}


intersection_t AABB::visit(AABB* bb)
{
    cout << "AABB" << "<-->" << "AABB" << endl;
    return INSIDE;
}


intersection_t AABB::visit(Frustum* bb)
{
    cout << "AABB" << "<-->" << "Frustum" << endl;
    return INSIDE;
}


intersection_t AABB::visit(Sphere* bb)
{
    cout << "AABB" << "<-->" << "Sphere" << endl;
    return INSIDE;
}

intersection_t AABB::intersects(bvVisitor* v) {
    return v->visit(this);
}

