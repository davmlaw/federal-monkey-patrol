// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Mar 31 00:30:59 2005
// Last modified: Thu Mar 31 00:30:59 2005

#ifndef CLAWALERT
#define CLAWALERT

#include "graphics/2d/drawable2d.h"

/**
 * Overlay displaying current claw level
 */
class ClawAlert : public Transitional2D {
public:
    ClawAlert(GLfloat w, GLfloat h);
    virtual ~ClawAlert();
    virtual void representation(GLfloat alpha);
private:
    Drawable2D* chart;
    Drawable2D* line;
};

#endif // CLAWALERT
