// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 22:07:06 2005
// Last modified: Sun Mar 20 22:07:06 2005

#include "entitydrawer.h"

using namespace std;


void EntityDrawer::representation(drawdetails_t& drawdetails)
{
    list<Entity*>::iterator i, end=entlist->end();
    for( i=entlist->begin() ; i != end ; ++i ) {
	(*i)->drawable->draw(drawdetails);
    }
}


