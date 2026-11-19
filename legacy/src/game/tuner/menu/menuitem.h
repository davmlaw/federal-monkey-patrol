// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 14:35:35 2005

#ifndef MENUITEM_H
#define MENUITEM_H

class MenuItem {
public:
    MenuItem() { };
    virtual ~MenuItem() { };
    virtual void left(void) = 0;
    virtual void right(void) = 0;
    virtual void trigger(void) = 0;
};

#endif // MENUITEM_H
