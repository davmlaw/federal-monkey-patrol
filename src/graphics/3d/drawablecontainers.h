// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr  5 23:22:45 2005
// Last modified: Tue Apr  5 23:22:45 2005

// DrawableContainer    = A simple container class for any Drawable.
// DrawableLODContainer = Level Of Detail node similar to DrawableContainer.
// DrawableFlyweight    = lightweight access for shared drawables
// DrawableStaticFlyweight = access for shared drawables stored as display
//                           lists (faster but must be static)


#ifndef DRAWABLECONTAINERS
#define DRAWABLECONTAINERS

#include "graphics/3d/drawable.h"
#include "graphics/3d/boundeddrawable.h"

// This doesn't store children very cleverly (just a list)
// there are no accelaration/culling algorithms
// but is good for any drawable.
class DrawableContainer : public Drawable {
public:
	DrawableContainer() { };
	~DrawableContainer();
	virtual void representation(drawdetails_t& drawdetails);
	virtual void add(Drawable *);
	virtual Drawable* clone(void) const {
		throw std::string("FIXME: DrawableContainer.clone() not implemented");
		return 0;
	};
private:
	drawable_list_t children;
	drawable_list_t::iterator kid;
};


// Flyweights are used as small wrapper classes to share a pool of Drawables
class DrawableFlyweight : public Drawable {
public:
	DrawableFlyweight(Drawable *d);  // abstract
	~DrawableFlyweight() { };
	virtual void representation(drawdetails_t& drawdetails);
	//    virtual int isOccluded(drawdetails_t& drawdetails);
	virtual Drawable* clone(void) const {
		return new DrawableFlyweight(*this);
	};
private:
	Drawable *child;
};

// -[17May04]- Changed so model_factory gens display list to remove conditional
// inside DrawableStaticFlyweight::representation (for speedup)
class DrawableStaticFlyweight : public DrawableFlyweight {
public:
	DrawableStaticFlyweight(Drawable* d, GLuint l);
	~DrawableStaticFlyweight() { };
	virtual void representation(drawdetails_t& drawdetails);
	virtual Drawable* clone(void) const {
		return new DrawableStaticFlyweight(*this);
	};
private:
	GLuint list;
};

#endif // DRAWABLECONTAINERS
