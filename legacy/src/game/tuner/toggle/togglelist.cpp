// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Feb 10 01:31:09 2005
// Last modified: Thu Feb 10 01:31:09 2005

#include "togglelist.h"

using namespace std;


ToggleList::ToggleList(const strings_t& args):
    values(args),
    i(0)
{
    setLabel("type");
    if( args.size() < 1 )
	throw string("ToggleList: Given empty list");
}


string ToggleList::getTextValue(void)
{
    return i>getMax()? "" : values[i];
}


// Set i to be the value of the element that contains val
// if not val is not in list, add it
void ToggleList::setTextValue(const std::string& val)
{
    bool found = false;
    float max = getMax();
    for( i=0 ; i<max ; ++i ) {
	if( values[i] == val ) {
	    found = true;
	    break;
	}
    }

    if( !found ) {
	values.insert(values.begin(),val);
	i = 0;
    }
}
