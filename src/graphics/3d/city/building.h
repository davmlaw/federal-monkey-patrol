// (C) David Lawrence released under the GPL (see license.txt)
// Started:       28 Apr 2004
// Last modified: 28 Apr 2004
// 

#ifndef BUILDING_H
#define BUILDING_H

#include "graphics/3d/drawable.h"
#include "graphics/texture.h"
#include "util/MersenneTwister.h"

/**
 * 3d building.
 * No steps, can have a different roof texture than sides.
 * @see Skyscraper
 */
class Building : public Drawable {
public:
    Building(MTRand& mt, GLfloat x_size, GLfloat y_size, GLfloat z_size);
    ~Building(void);
    void setWidth(GLfloat w) { width = w; };
    void setLength(GLfloat l) { length = l; };
    virtual Drawable* clone(void) const {
	return new Building(*this);
    };
protected:
    virtual void representation(drawdetails_t& drawdetails);
private:
    // depricated
    Building(const Building& rhs): Drawable(rhs),
				   walls(new Texture(*rhs.walls)),
				   roof(new Texture(*rhs.roof)),
				   floors(rhs.floors),
				   inv_window_size(rhs.inv_window_size),
				   gray(rhs.gray),
				   width(rhs.width),
				   length(rhs.length) { };
    Texture* walls;
    Texture* roof;
    GLint floors;
    GLfloat inv_window_size; // = 1/window_size
    GLfloat gray;
    GLfloat width;
    GLfloat length;
};

#endif
