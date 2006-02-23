// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jan 14 15:36:41 2006
// Kong level of detail

#ifndef DRAWABLELOD_H
#define DRAWABLELOD_H

#include "graphics/3d/drawable.h"

/**
 * Used to quickly call different Drawables depending on current Level Of Detail
 */
class LODTable : public Drawable {
public:
	LODTable(Drawable* table[], int size);
    virtual ~LODTable();
	virtual void representation(drawdetails_t& drawdetails);
private:
	Drawable** table;
	int size;
};

#endif // DRAWABLELOD_H
