// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:46 2005
// Last modified: Tue May 31 23:57:46 2005

#ifndef AABB_H
#define AABB_H

#include "boundingvolume.h"
#include "util/mtxlib.h"

/**
 * Axis Aligned Bounding Box.
 */
class AABB : public BoundingVolume, public bvVisitor {
    friend class Frustum;
    friend class Sphere;
public:
    AABB(const vector3& pos, const vector3& dim);
    AABB(const vector3& dim);
    void setPosition(const vector3& p);
    vector3 getDimensions() { return dimensions; };
    virtual intersection_t intersects(bvVisitor* v);
    virtual std::string getName(void) {
	return "AABB";
    };
    // bvVisitor
    virtual intersection_t visit(AABB*    bb);
    virtual intersection_t visit(Frustum* bb);
    virtual intersection_t visit(Sphere*  bb);
private:
    void recalculateArray();
    vector3 position;
    vector3 dimensions;
    float aabb[6]; // { MIN_X, MAX_X, MIN_Y, MAX_Y, MIN_Z, MAX_Z }
};


#endif // AABB_H
