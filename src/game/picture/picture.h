// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Mar 15 22:40:06 2005
// Last modified: Tue Mar 15 22:40:06 2005

// FIXME: This shares transitions setFime() and another game components
//        setFilename, perhaps move some of this to the base class...

#ifndef PICTURE
#define PICTURE

#include "game/gamecomponent.h"
#include "graphics/2d/drawable2d.h"
#include <iostream>

/**
 * Fullscreen picture
 */
class Picture : public GameComponent {
public:
    Picture();
    ~Picture();
    virtual std::string getName(void) { return "Picture"; };
    void setFilename(std::string& f) { filename = f; };
    void setTime(Uint32 msecs) { show_time = msecs; };
    void setColor(GLfloat r, GLfloat g, GLfloat b) {
	color[0]=r; color[1]=g; color[2]=b;
    };
protected:
    void _load(void);
    void _play(Uint32 msecs, Input* input, float alpha);
private:
    Drawable2D* image;
    std::string filename;
    Uint32 show_time;
    Uint32 time_displayed;
    GLfloat color[4];
};

#endif // PICTURE
