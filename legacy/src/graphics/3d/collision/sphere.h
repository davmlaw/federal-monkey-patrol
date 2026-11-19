// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:49 2005
// Last modified: Tue May 31 23:57:49 2005

#ifndef SPHERE_H
#define SPHERE_H

#include "boundingvolume.h"
#include "util/mtxlib.h"

/**
 * Spherical 3d volume
 */
class Sphere : public BoundingVolume, public bvVisitor {
    friend class AABB;
    friend class Frustum;
public:
    Sphere(const vector3& pos, float r): position(pos), radius(r) { };
    Sphere(float r): position(0.0f, 0.0f, 0.0f), radius(r) { };
    virtual intersection_t intersects(bvVisitor* v);
    virtual std::string getName(void) {
	return "Sphere";
    };
    // bvVisitor
    virtual intersection_t visit(AABB*    bb);
    virtual intersection_t visit(Frustum* bb);
    virtual intersection_t visit(Sphere*  bb);
    void setPosition(const vector3& pos) { position = pos; };
private:
    vector3 position;
    float radius;
};


#endif // SPHERE_H
