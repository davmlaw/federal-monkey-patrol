// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:57:52 2005
// Last modified: Tue May 31 23:57:52 2005

#ifndef FRUSTUM_H
#define FRUSTUM_H

#include "boundingvolume.h"
#include "util/mtxlib.h"

/**
 * Frustum 3d volume.
 * Used for calculating camera projection. If somethign clips with frustum, it is drawn
 */
class Frustum : public BoundingVolume, public bvVisitor {
    friend class AABB;
    friend class Sphere;
public:
    Frustum(const matrix44& view, const matrix44& prj);
    virtual intersection_t intersects(bvVisitor* v);
    virtual std::string getName(void) {
	return "Frustum";
    };
    // bvVisitor
    virtual intersection_t visit(AABB*    bb);
    virtual intersection_t visit(Frustum* bb);
    virtual intersection_t visit(Sphere*  bb);
private:
    void ExtractFrustum(const matrix44& view, const matrix44& prj);
    intersection_t AABBIntersectFrustum(const float* aabb);
    float frustum[6][4]; // The 6 planes that describe the viewing frustum
};


#endif // FRUSTUM_H
