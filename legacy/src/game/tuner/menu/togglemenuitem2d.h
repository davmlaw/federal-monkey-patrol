// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 18:11:32 2005

#ifndef TOGGLEMENUITEM2D_H
#define TOGGLEMENUITEM2D_H

#include "game/tuner/menu/menu2d.h"
#include "game/tuner/toggle/toggle.h"
#include "graphics/2d/slidebar2.h"

/**
 * Visual representation of a toggle
 */
class ToggleMenuItem2D : public MenuItem2D {
public:
    ToggleMenuItem2D(float w, float h, Toggle* t);
    virtual ~ToggleMenuItem2D();
    void left(void);
    void right(void);
    void trigger(void) { /* empty */ };
protected:
    void drawMenuItem(float alpha);
private:
    Toggle* toggle;
    SlideBar2* slidebar;
    Drawable2D* box;
    float value_pos;
    // Explicitly disable compiler generated copy functions
    ToggleMenuItem2D(const ToggleMenuItem2D& rhs);
    ToggleMenuItem2D& operator=(const ToggleMenuItem2D& rhs);
};

#endif // TOGGLEMENUITEM2D_H
