// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Mon Oct  3 16:33:38 2005

#include "togglefactory.h"
#include "game/tuner/toggle/togglefloat.h"
#include "game/tuner/toggle/toggleswitch.h"
#include "game/tuner/toggle/togglelist.h"
#include "util/settings.h"
#include "util/xmlhelper.h"

using namespace std;

extern Settings settings;

static toggle_list_t parent(Settings* s, xmlNodePtr node);

ToggleFactory::ToggleFactory()
{
    const string DIR = dircheck( settings.get("main", "config.dir") );
    string filename = "toggles.xml";

    XMLDoc doc(DIR + filename);

    xmlNodeList parentXML;
    xmlNodeList::iterator i;
    xml_list(doc.root->children, parentXML);

    map<string,toggle_list_t> toggles;
    for( i=parentXML.begin() ; i != parentXML.end() ; ++i ) {
	cout << "Doing " << (*i)->name << endl;
	toggleComponents[(const char*)(*i)->name] = parent(&settings, *i);
	cout << "Finished " << (*i)->name << endl;
    }
}


ToggleFactory::~ToggleFactory()
{
    cout << "~ToggleFactory()\n";
    // fixme: clean up memory (though the OS should)
}


ToggleFactory& ToggleFactory::Instance(void)
{
    static ToggleFactory _instance;
    return _instance;
}


toggle_list_t ToggleFactory::getComponentList(string componentName)
{
    return toggleComponents[componentName];
}


static toggle_list_t parent(Settings* s, xmlNodePtr node)
{
    toggle_list_t toggles;

    string parent = (const char*)node->name;
    xmlNodeList keysXML;
    xml_list(node->children, keysXML);
    xmlNodeList::iterator i;
    xmlStringMap info;
    for( i=keysXML.begin() ; i != keysXML.end() ; ++i ) {
	info.clear();
	xml_map((*i)->children, info);
	string key = (const char*)(*i)->name;
	string type  = info["type"];
	string label = info["label"];
	if( label.empty() )
	    label = key;

	Toggle* toggle = 0;
	if( type == "float" ) {
	    xmlStringMap props;
	    xml_map((*i)->children, props);

	    //cout << label << "float, min = " << props["min"] << endl;
	    float min = stringToFloat( props["min"] );
	    float max = stringToFloat( props["max"] );
	    string modstr = props["mod"];
	    if( !modstr.empty() ) {
		float mod = stringToFloat( modstr );
		toggle = new ToggleFloat(min, max, mod);
	    } else {
		toggle = new ToggleFloat(min, max);
	    }
	} else if ( type == "list" ) {
	    xmlStringList values;
	    xml_list((*i)->children, values, "val");
	    xmlStringList::iterator v;
	    strings_t args;
	    for( v=values.begin() ; v != values.end() ; ++v ) {
		args.push_back( *v );
	    }
	    toggle = new ToggleList(args);
	} else if ( type == "switch" ) {
	    cout << label << " switch!\n";
	    toggle = new ToggleSwitch();
	} else {
	    string msg = "BAD toggle data for name = ";
	    throw msg + (const char*)(*i)->name;
	}
	toggle->setLabel( label );
	toggle->linkTo( s, parent, key );
	toggles.push_back( toggle );
    }
    return toggles;
}

