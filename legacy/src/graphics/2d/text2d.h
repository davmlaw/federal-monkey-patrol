// (C) David Lawrence released under the GPL (see license.txt)
// Started:       20 Apr 2004
// Last modified: 14 Apr 2004

#ifndef TEXT2D_H
#define TEXT2D_H

#include "graphics/2d/drawable2d.h"
#include "graphics/texture.h"
#include <iostream>

float text_width(const char *str);
float text_height(const char *str);

/**
 * Text overlay
 */
class Text2D : public Drawable2D {
public:
    Text2D(const std::string& t, float font);
    virtual ~Text2D();
protected:
    virtual void representation(GLfloat alpha);
private:
    std::string text;
    Texture* texture;
    float font;
};

#endif
