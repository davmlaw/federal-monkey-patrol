// (C) David Lawrence released under the GPL (see license.txt)
// Ok, so I miss parts of Java...
// Started:       11 Dec 2004
// Last modified: 11 Dec 2004

#ifndef PROPERTIES_H
#define PROPERTIES_H

#include <string>
#include <vector>
#include <map>
#include "util/textfile_reader.h"
#include "util/string_util.h"

/**
 * Like java Properties.
 * Loads key/value pairs from file
 */
template<class T>
class Properties : public TextFileReader {
    friend class Settings;
public:
    typedef typename std::map<std::string, T> prop_map_t;

    Properties(const std::string& f):
	TextFileReader(f),
	filename(f) {
	process();
    };
    // return property or empty string if not exist
    T get(const std::string& key) const {
	typename prop_map_t::const_iterator p = prop.find( key );
	if( p != prop.end() )
	    return p->second;
	else
	    throw "Properties ('" + filename + "'): no key \"" + key + "\"";
    };

    strings_t keys(void) const {
	strings_t k;

	typename prop_map_t::const_iterator it;
	for( it = prop.begin() ; it != prop.end() ; ++it ) {
	    k.push_back( it->first );
	}

	return k;
    };
    typename prop_map_t::const_iterator begin(void) const {
	return prop.begin();
    };
    typename prop_map_t::const_iterator end(void) const {
	return prop.end();
    };
protected:
    void set(const std::string& key, const T& t) {
	prop[key] = t;
    }
private:
    void handle_line(std::string& line) {
	std::string key, val;
	extract_first_rest(line, key, val, "=");
	prop[key] = val;
    };
    prop_map_t prop;
    std::string filename;
};




#endif
