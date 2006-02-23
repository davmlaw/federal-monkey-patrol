// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Dec 19 22:03:33 2004
// Last modified: Sun Dec 19 22:03:33 2004

#ifndef SETTINGS
#define SETTINGS

#include <string>
#include <map>
#include <vector>
#include "util/scalar.h"
#include "util/properties.h"

typedef std::map<std::string, Properties<Scalar>*> settings_t;

/**
 * Holds game settings
 */
class Settings {
public:
    Settings();
    virtual ~Settings();
    const Properties<Scalar>* Settings::get(const std::string& parent) const;
    const Scalar get(const std::string& parent, const std::string& key) const;
    // typed gets (string,int,float)
    const std::string gets(const std::string& parent,
			   const std::string& key) const;
    const int geti(const std::string& parent,
		   const std::string& key) const;
    const float getf(const std::string& parent,
		     const std::string& key) const;
    void set(const std::string& parent, const std::string& key,
	     const std::string& value);
    strings_t keys(void) const;
private:
    settings_t settings;
};

#endif // SETTINGS
