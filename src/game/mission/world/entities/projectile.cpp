// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun May  8 23:54:20 2005
// Last modified: Sun May  8 23:54:20 2005

#include "projectile.h"
#include "graphics/3d/billboards.h"
#include "graphics/3d/model.h"
#include "util/properties.h"
#include "util/scalar.h"
#include "util/string_util.h"
#include <map>

using namespace std;

typedef map<string, projectile_t*> ProjTable;
ProjTable proj_table;

projectile_t* projectile_load_from_disk(const string& type);


Projectile* Projectile_Factory(const string& type)
{
    Projectile*   proj  = 0;
    projectile_t* ptype = 0;

    ProjTable::iterator p = proj_table.find( type );
    if( p != proj_table.end() )
	ptype = p->second;
    else
	ptype = projectile_load_from_disk(type);

    if( ptype )
	proj = new Projectile( ptype );
    else
	cout << "VERY VERY BAD\n";
    return proj;
}



projectile_t* projectile_load_from_disk(const string& type)
{
    projectile_t* ptype = 0;

    cout << "trying to load '" << type << "' from disk\n";

    try {
	string dir = "data/etc/projectiles/";
	Properties<Scalar> prop(dir + type + ".properties");
	ptype = new projectile_t();
	
	// Drawable
	Drawable* d = 0;
	string      str = prop.get("drawable");
	strings_t words = split(str);
	if( words.size() >= 2 ) {
	    if( words[0] == "BB" )
		d = new Billboard( words[1], 10, 10 );
	    else if( words.size() >= 3 && words[0] == "MDL" ) {
		d = Model::Factory( words[1], words[2] );
		//d->rotate(0.0f, 180.0f, 0.0f);
	    }
	}

	ptype->drawable_prototype = d; // clone it.
	ptype->lifetime           = prop.get("lifetime");
	ptype->gravity            = prop.get("gravity");
	ptype->air_resistance     = prop.get("air_resistance");

	proj_table[type] = ptype;
    } catch (string& bad) {
	cout << "Projectile_Factory: " << bad << endl;
    }

    return ptype;

}




Projectile::Projectile(projectile_t* v):
    Entity(v->drawable_prototype->clone()),
    values(v),
    lifetime(v->lifetime)
{
    assert(drawable != 0);

}


Projectile::~Projectile()
{

}


void Projectile::_update(World& world, Uint32 msecs)
{
    if( lifetime ) {
	lifetime -= msecs;
	if( lifetime <= 0 ) {
	    setDead();
	    //world.remove_entity( this );
	}
    }

}
