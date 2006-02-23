// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Feb 22 23:05:12 2006
// Thanks Gary William Flake for the book Computational Beauty of Nature
// and sample lsys code (on which this is influenced)

#ifndef LSYSRENDERER_H
#define LSYSRENDERER_H

#include "graphics/3d/drawable.h"
#include "util/lsystem.h"

class LSysRenderer : public Drawable {
public:
    LSysRenderer(const LSystem& ls);
    virtual ~LSysRenderer();
    virtual Drawable* clone(void) const;
	void setAngle(float a) { angle = a; };
	void setDistance(float d) { distance = d; };
protected:
    virtual void representation(drawdetails_t& drawdetails);
private:
	void renderLSys(const char* str);
	// Explicitly disable compiler generated copy functions
	// (allow default copy ctor) LSysRenderer(const LSysRenderer& rhs);
	LSysRenderer& operator=(const LSysRenderer& rhs);
	LSystem lsys;
	float angle;
	float distance;
};

#endif // LSYSRENDERER_H
