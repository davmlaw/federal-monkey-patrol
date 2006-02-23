// (C) David Lawrence released under the GPL (see license.txt)
// Started:              2003
// Last modified: 14 Apr 2004

#ifndef SKYSCRAPER_H
#define SKYSCRAPER_H

#include "graphics/3d/drawable.h"
#include "graphics/texture.h"
#include "util/MersenneTwister.h"

/**
 * Skyscraper
 * Has 1 window texture which is repeated to look like windows
 */
class Skyscraper : public Drawable {
public:
    Skyscraper(MTRand& mt, GLfloat w, GLfloat h);
    ~Skyscraper(void);
    void setWidth(GLfloat w) { width = w; };
    GLfloat getWidth(void) { return width; };
    virtual Drawable* clone(void) const {
	throw "FIXME: Skyscraper.clone() not implemented";
	return 0;
    };
protected:
	virtual void representation(drawdetails_t& drawdetails);
private:
	GLfloat *intertwined;
	unsigned int num_elements;
	unsigned int num_steps;
	float *step;
	float window_size;
	float spire;
	float spire_normal[3];
	Texture *tex;
	GLfloat gray;
	GLfloat width;
	void create_interleaved_array(void);
};

#endif
