// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Dec 19 22:03:33 2004
// Last modified: Sun Dec 19 22:03:33 2004

#include "settings.h"
#include <string>
#include <iostream>

using namespace std;


Settings::Settings()
{
	cout << "Settings()\n";
    strings_t components;
    components.push_back("display");
    components.push_back("story");
    components.push_back("physics");
    components.push_back("game");
    components.push_back("main");
    components.push_back("tuner");
    components.push_back("city");

    string dir = "data/etc/";
    strings_t::iterator i;
    for( i = components.begin(); i != components.end() ; ++i ) {
	string filename = dir + *i + ".properties";
	//cout << "settings[" << *i << "] = " << filename << endl;

	try {
	    settings[*i] = new Properties<Scalar>( filename );
	} catch( string e ) {
	    cout << "exception: " << e << endl;
	    throw;
	}
    }
}


Settings::~Settings()
{
    settings_t::iterator it;
    for( it = settings.begin() ; it != settings.end() ; ++it ) {
	delete it->second;
    }
}


const Properties<Scalar>* Settings::get(const string& parent) const
{
    settings_t::const_iterator it = settings.find(parent);
    if( it != settings.end() )
	return it->second;
    else
	throw "Settings: cannot find properties for module \"" + parent + "\"";
}


const Scalar Settings::get(const string& parent, const string& key) const
{
    const Properties<Scalar>* p = get(parent);
    return p->get(key);
}


const string Settings::gets(const string& parent, const string& key) const
{
    return get(parent, key);
}


const int Settings::geti(const string& parent, const string& key) const
{
    return get(parent, key);
}


const float Settings::getf(const string& parent, const string& key) const
{
    return get(parent, key);
}


void Settings::set(const std::string& parent, const std::string& key,
		   const std::string& value)
{
    cout << "#############@@@@@@@@@@@@@@@@@@@###############\n";
    cout << "Settings(" << parent << ", " << key << ") = '" << value << "'\n";
    settings_t::iterator it = settings.find(parent);
    if( it != settings.end() ) {
	it->second->set(key, value);
    }
}


// FIXME: Genericise this so that properties can share this
strings_t Settings::keys(void) const
{
    strings_t k;

    settings_t::const_iterator it;
    for( it = settings.begin() ; it != settings.end() ; ++it ) {
	k.push_back( it->first );
    }

    return k;
}
