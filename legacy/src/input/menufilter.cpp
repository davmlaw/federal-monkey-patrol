// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 13 01:19:36 2005
// Last modified: Sun Mar 13 01:19:36 2005

#include "menufilter.h"

using namespace std;


void MenuFilter::_read(Input& input)
{
    //request_skip = input.buttonPressed( input.FIRE1 );
    ok_pressed = input.buttonPressed( input.FIRE1 );
    axis = input.getAxis();
}
