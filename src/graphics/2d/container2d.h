// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr 12 00:38:50 2005
// Last modified: Tue Apr 12 00:38:50 2005

#ifndef CONTAINER2D
#define CONTAINER2D

#include "graphics/2d/drawable2d.h"
#include <vector>

/**
* A collection of Drawable2D objects
*/
class Container2D : public Drawable2D {
public:
	Container2D(GLfloat w, GLfloat h);
	virtual ~Container2D();
	virtual void representation(GLfloat alpha);
	void add(Drawable2D* d, int alignment = NONE);
	enum {
		NONE  = 0,
		LEFT  = 1,
		RIGHT = 2,
		TOP   = 4,
		BOTTOM= 8
	};
private:
	std::vector<Drawable2D*> children;
};

#endif // CONTAINER2D
