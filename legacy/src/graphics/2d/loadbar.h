// (C) David Lawrence released under the GPL (see license.txt)
// Started:       25 Jun 2004
// Last modified: 25 Jun 2004

#ifndef LOADBAR_H
#define LOADBAR_H

#include <vector>
#include <string>
#include "graphics/2d/drawable2d.h"
#include "graphics/display.h"
#include "graphics/texture.h"
#include "util/mtxlib.h"

/**
 * Draws a pretty load bar like Seattle mugs
 */
class LoadBar : public Transitional2D {
public:
    LoadBar();
    ~LoadBar();
protected:
    virtual void representation(GLfloat alpha);
private:
    // across up across down across up across down across up etc
    std::vector<GLfloat> skyline_segments;
    std::vector<vector2> windows;
    GLfloat total_skyline_length;
    Drawable2D *flare;
    Drawable2D *text;

    // settings
    GLfloat bgcolor[4];
    GLfloat skylinecolor[4];
    GLfloat windowcolor[4];
    GLfloat barcolor[4];
    float bg_line_width;
    float bar_line_width;
    float win_w;
    float win_h;
};

#endif
