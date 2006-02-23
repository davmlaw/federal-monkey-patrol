// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue May 31 23:32:37 2005
// Last modified: Tue May 31 23:32:37 2005

#ifndef BOUNDINGVOLUME_H
#define BOUNDINGVOLUME_H

#include <string>

typedef enum {
    OUTSIDE,
    INTERSECTING,
    INSIDE
} intersection_t;


class AABB;
class Sphere;
class Frustum;

/**
 * Visitor for BoundingVolume
 * @see BoundingVolume
 */
class bvVisitor {
public:
    virtual ~bvVisitor() { };
    virtual intersection_t visit(AABB*    bb) = 0;
    virtual intersection_t visit(Frustum* bb) = 0;
    virtual intersection_t visit(Sphere*  bb) = 0;
};

/**
 * Represents 3d volume, visited by bvVisitor
 * @see bvVisitor
 */
class BoundingVolume {
public:
    BoundingVolume() { };
    virtual ~BoundingVolume() { };
    virtual intersection_t intersects(bvVisitor* v) = 0; // (accept)
    virtual std::string getName(void) = 0;
};


#endif // BOUNDINGVOLUME_H
