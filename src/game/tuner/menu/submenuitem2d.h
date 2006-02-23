// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 20:25:04 2005

#ifndef SUBMENUITEM2D_H
#define SUBMENUITEM2D_H

#include "game/tuner/menu/menu2d.h"
#include <string>

/**
 * Item in a Tuner Menu
 * @see Tuner
 */
class SubMenuItem2D : public MenuItem2D {
public:
    SubMenuItem2D(float w, float h, const std::string& n);
    virtual ~SubMenuItem2D();
    void left(void)  { /* empty */ };
    void right(void) { /* empty */ };
    virtual void trigger(void);
protected:
    void drawMenuItem(float alpha);
private:
    std::string name;
    // Explicitly disable compiler generated copy functions
    SubMenuItem2D(const SubMenuItem2D& rhs);
    SubMenuItem2D& operator=(const SubMenuItem2D& rhs);
};


// An menu item that returns control back to parent menu
class BackItem2D : public SubMenuItem2D {
public:
    BackItem2D(float w, float h, const std::string& n):
	SubMenuItem2D(w,h,n){ };
    void trigger(void) {
	parent->upMenu();
    };
};


#endif // SUBMENUITEM2D_H
