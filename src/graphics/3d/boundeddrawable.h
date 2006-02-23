// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Oct 26 15:36:41 2005

#ifndef BOUNDEDDRAWABLE_H
#define BOUNDEDDRAWABLE_H

#include "graphics/3d/drawable.h"
#include "graphics/3d/collision/aabb.h"
#include "graphics/3d/collision/sphere.h"

/**
 * A 3d object that has a bounding volume
 */
class BoundedDrawable : public Drawable {
public:
    BoundedDrawable() { };
    virtual ~BoundedDrawable() { };
	virtual void add(Drawable* d) {
		Drawable::add(d);
	}
	virtual void add(BoundedDrawable* bd) {
		throw std::string("BoundedDrawable::add(BoundedDrawable*) not implemented");
	};
protected:
    virtual BoundingVolume* getBoundingVolume(const vector3& offset) = 0;
    virtual int isOccluded(drawdetails_t& drawdetails);
};

typedef std::vector<BoundedDrawable*> bounded_drawable_list_t;

/**
 * A container for 3d objects with bounding volumes
 */
class BoundedDrawableContainer : public BoundedDrawable {
public:
	BoundedDrawableContainer() { };
	~BoundedDrawableContainer();
	virtual void representation(drawdetails_t& drawdetails);
	virtual void add(Drawable *);
	virtual void add(BoundedDrawable *);
private:
	drawable_list_t unboundedChildren;
	bounded_drawable_list_t boundedChildren;
};

class DrawableAABB : public BoundedDrawable {
public:
    DrawableAABB(const vector3& dimensions);
	DrawableAABB(const AABB& a);
    virtual ~DrawableAABB() { };
protected:
    virtual BoundingVolume* getBoundingVolume(const vector3& offset);
    AABB aabb;
};

class DrawableSphere : public BoundedDrawable {
public:
    DrawableSphere(float radius);
    virtual ~DrawableSphere() { };
protected:
    virtual BoundingVolume* getBoundingVolume(const vector3& offset);
    Sphere sphere;
};


#endif // BOUNDEDDRAWABLE_H
