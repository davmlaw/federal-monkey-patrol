// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 18:11:32 2005

#include "togglemenuitem2d.h"
#include "graphics/2d/container2d.h"
#include "graphics/2d/text2d.h"

using namespace std;


ToggleMenuItem2D::ToggleMenuItem2D(float w, float h, Toggle* t):
    MenuItem2D(w,h),
    toggle(t),
    slidebar(0),
    box(0)
{
    const int NUM_COLUMNS = 3;
    float col_width  = getWidth() / NUM_COLUMNS;
    float xpos = -col_width; // start at left column

    Drawable2D* label = new Text2D( toggle->getLabel(), 0.2f );
    label->position.x = xpos;
    xpos += col_width;

    slidebar = new SlideBar2( col_width * 0.8f , 0.02f);
    slidebar->position.x = xpos;

    xpos += col_width;
    value_pos = xpos;

    {
	Container2D* container = new Container2D(getWidth(), getHeight());
	container->add( label );
	container->add( slidebar );
	box = container;
    }
}


ToggleMenuItem2D::~ToggleMenuItem2D()
{
    // don't delete toggle, as they are shared from ToggleFactory
    delete box; // Container will delete slidebar
}


void ToggleMenuItem2D::left() {
    toggle->left();
}


void ToggleMenuItem2D::right() {
    toggle->right();
}


void ToggleMenuItem2D::drawMenuItem(float alpha)
{
    float ratio = (toggle->getPos() - toggle->getMin()) / toggle->getRange();
    slidebar->setState(ratio);
    box->setWidth( getWidth() );
    box->setHeight( getHeight() );
    box->draw(alpha);

    Text2D value( toggle->getTextValue(), 0.2f );
    value.position.x = value_pos;
    value.draw(alpha);
}
