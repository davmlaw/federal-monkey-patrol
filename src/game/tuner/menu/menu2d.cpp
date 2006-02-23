// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 17:50:31 2005

#include "menu2d.h"
#include "graphics/2d/slidebar.h"
#include "graphics/2d/slidebar2.h"
#include "graphics/2d/text2d.h"
#include "util/util.h"
//#include <iostream>

using namespace std;


void MenuItem2D::drawHighlight(float alpha)
{
	Quad bar(getWidth(), getHeight());
	glDisable(GL_TEXTURE_2D);
	bar.setColor(1.0f, 0.0f, 0.0f);
	bar.draw(alpha/2.0f);
}

/////////////


Menu2D::~Menu2D()
{
	vector<MenuItem2D*>::iterator i;
	for( i = rows.begin() ; i != rows.end() ; ++i ) {
		delete *i;
	}
}

void Menu2D::up(void) {
	if( child ) {
		child->up();
	} else {
		deSelect();
		selected = clamp<unsigned int>( 0, --selected, (unsigned int)rows.size()-1 );
	}
};

void Menu2D::down(void) {
	if( child ) {
		child->down();
	} else {
		deSelect();
		selected = clamp<unsigned int>( 0, ++selected, (unsigned int)rows.size()-1 );
	}
};

void Menu2D::right(void) {
	if( child ) {
		child->right();
	} else {
		rows[selected]->right();
	}
};

void Menu2D::left(void) {
	if( child ) {
		child->left();
	} else {
		rows[selected]->left();
	}
};

void Menu2D::trigger(void) {
	if( child ) {
		child->trigger();
	} else {
		rows[selected]->trigger();
	}
};


void Menu2D::representation(GLfloat alpha)
{
	if( child ) {
		child->draw(alpha);
	} else {
		rows[selected]->setSelected(true);

		float row_height = getHeight() / show_rows;
		float ypos  = getHeight()/2 - row_height/2;

		vector<MenuItem2D*>::iterator row;
		for( row=rows.begin() ; row != rows.end() ; ++row ) {
			(*row)->position.y = ypos;
			(*row)->draw( alpha );
			ypos -= getHeight() / show_rows;
		}
	}
}


void Menu2D::add(MenuItem2D* t)
{
	rows.push_back( t );
	t->setParent(this);
}


void Menu2D::downMenu(Menu2D* c)
{
	child = c;
}


void Menu2D::restoreMenu(void)
{
	delete child;
	child = 0;
}

void Menu2D::upMenu(void)
{
	if( parent ) {
		parent->restoreMenu();
	} else {
		throw string(__FILE__) + ": upMenu() called with no parent";
	}
}
