// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul 24 20:25:04 2005

#include "submenuitem2d.h"
#include "graphics/2d/text2d.h"
#include "util/settings.h"
#include "game/tuner/toggle/toggle.h"
#include "game/tuner/toggle/togglefactory.h"
#include "game/tuner/menu/togglemenuitem2d.h"
#include <iostream>

using namespace std;

extern Settings settings;

SubMenuItem2D::SubMenuItem2D(float w, float h, const string& n):
    MenuItem2D(w,h),
    name(n)
{

}


SubMenuItem2D::~SubMenuItem2D()
{

}


// load submenu
void SubMenuItem2D::trigger(void)
{
    //const Properties<Scalar>* prop = settings.get( name );
    //strings_t propnames = prop->keys();
    int rows = 5;

    Menu2D* menu = new Menu2D( name, rows, parent );
	
    float pad = 0.01f;
    float menu_w = parent->getWidth() - 2 * pad;
    float menu_h = parent->getHeight() - 2 * pad;
    float row_h = menu_h / rows;
    menu->setWidth ( menu_w );
    menu->setHeight( menu_h );

    toggle_list_t components= ToggleFactory::Instance().getComponentList(name);
    toggle_list_t::iterator i;
    for( i = components.begin() ; i != components.end() ; ++i ) {
	menu->add( new ToggleMenuItem2D( menu_w, row_h, *i ) );
    }

    string label = "Back to " + parent->getName();
    BackItem2D* backitem = new BackItem2D(menu_w, row_h, label);
    menu->add( backitem );
    parent->downMenu( menu ); // let new menu take control
}


void SubMenuItem2D::drawMenuItem(float alpha)
{
    Text2D txt( name, 0.2f );
    txt.draw(alpha);
}
