// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 17:50:31 2005

#ifndef MENU2D_H
#define MENU2D_H

#include "game/tuner/menu/menuitem.h"
#include "graphics/2d/drawable2d.h"
#include "menuitem.h"
#include <vector>

class Menu2D;

class MenuItem2D : public Drawable2D, public MenuItem {
public:
	MenuItem2D(): parent(0), selected(false) { };
	MenuItem2D(float w, float h): Drawable2D(w,h), selected(false) { };
	virtual ~MenuItem2D() { };
	void setSelected(bool s) { selected = s; };
	virtual void left(void) = 0;
	virtual void right(void) = 0;
	virtual void trigger(void) = 0;
	void setParent(Menu2D* p) { parent = p; };
protected:
	void representation(GLfloat alpha) {
		drawMenuItem(alpha);
		if( selected ) {
			drawHighlight(alpha);
		}
	};
	virtual void drawMenuItem(float alpha) = 0;
	virtual void drawHighlight(float alpha); // default version is ok
	Menu2D* parent;
private:
	bool selected;
	// Explicitly disable compiler generated copy functions
	MenuItem2D(const MenuItem2D& rhs);
	MenuItem2D& operator=(const MenuItem2D& rhs);
};


// FIXME: combine a mixin interface for commonality of this & above

class Menu2D : public Drawable2D, public MenuItem {
public:
	Menu2D(const std::string& n, unsigned int d, Menu2D* p=0): name(n),
		parent(p),
		child(0),
		selected(0),
		show_rows(d){ };
	virtual ~Menu2D();
	virtual void representation(GLfloat alpha);
	void add(MenuItem2D* t);
	void up(void);
	void down(void);
	void right(void);
	void left(void);
	void trigger(void);
	// Moves up/down the menus by delegating to child menu
	void downMenu(Menu2D* c);
	void restoreMenu(void);
	void upMenu(void);
	std::string getName(void) { return name; };
private:
	// Explicitly disable compiler generated copy functions
	Menu2D(const Menu2D& rhs);
	Menu2D& operator=(const Menu2D& rhs);
	void deSelect(void) {
		rows[selected]->setSelected(false);
	};
	std::string name;
	Menu2D* parent;
	Menu2D* child;
	unsigned int selected;
	unsigned int show_rows;
	std::vector<MenuItem2D*> rows;
};


#endif // MENU2D_H
