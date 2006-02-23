// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sat Jan 14 15:36:41 2006

#include "drawablelod.h"
#include <iostream>

using namespace std;

LODTable::LODTable(Drawable* t[], int s)
{
/*
	You want to jump into the array like this:

	|-0-|-1-|-2-| Element
	0.0        1.0 LOD

	Say the array (size = 3) contains:

	[0] -> LowDetail
	[1] -> MidDetail
	[2] -> HighDetail

	Trouble is, if lod = 1.0, size(3) * 1.0 = 3, which is out of bounds.
	You could say (size-1) * lod, but that gives an unfair spread.
	Conditionals are slow, so the easiest is to just add an extra element on the end
*/
	if (s<1)
		throw invalid_argument("LODTable: minimum table length is 1");

	size = s + 1;
	table = new Drawable*[size];

	for (int i=0 ; i<s ; ++i) {
		table[i] = t[i];		
	}
	t[size-1] = t[size-2];
}


LODTable::~LODTable()
{
	for (int i=0 ; i<size ; ++i) {
		delete table[i];		
	}
	
	delete[] table;
}


void LODTable::representation(drawdetails_t& drawdetails)
{
	table[(int)(drawdetails.lod * size)]->representation(drawdetails);
}



/*



//////// LOD
/// My feeling is that LOD selection should be done inside each object
//  however this results in a very large amount of calls that will do nothing.
//  LOD Container will NOT call draw on children that are outside of minimum
//  visible LOD. Once draw() is called, the child can decide what level of
//  detail it wants.
struct LODchild {
	Drawable* drawable;
	GLfloat min_visible_lod;
	bool operator<(const LODchild& x) const {
		return min_visible_lod < x.min_visible_lod;
	};
};


typedef std::vector<LODchild> LOD_list_t;

class DrawableLODContainer : public DrawableAABB {
public:
	DrawableLODContainer(const vector3& dim): DrawableAABB(dim) { };
	~DrawableLODContainer(void);
	virtual void representation(drawdetails_t& drawdetails);
	virtual void add(Drawable *);
	void add(Drawable *, GLfloat min_lod);
	//	virtual int isOccluded(drawdetails_t& drawdetails);
	virtual Drawable* clone(void) {
		throw "FIXME: DrawableLODContainer.clone() not implemented";
		return 0;
	};
private:
	LOD_list_t children;
};

//////////////// Cpp


///////////////// LOD ////////
DrawableLODContainer::~DrawableLODContainer()
{
	LOD_list_t::iterator kid;
	for( kid=children.begin() ; kid != children.end() ; ++kid ) {
		delete kid->drawable;
	}
}

void DrawableLODContainer::add(Drawable *d)
{
	add( d, 0.0f ); // Always visible...
}


void DrawableLODContainer::add(Drawable *d, GLfloat l)
{
	LODchild c;
	c.drawable = d;
	c.min_visible_lod = l;

	children.push_back(c);

	// We need iterators so we can't use a priority queue which would
	// add the elements in sorted order. Instead we have to resort the
	// list each add. This is slow, but each LODcontainer should only have
	// a few children and add() isn't called often.
	if( children.size() > 1 )
		sort( children.begin(), children.end() );

	if( d->getHeight() > this->getHeight() )
		setHeight( d->getHeight() );

}


void DrawableLODContainer::representation(drawdetails_t& drawdetails)
{
	drawdetails.flags |= INSIDE_FRUSTUM_BIT; // save kids isOccluded calls

	LOD_list_t::iterator kid;
	if (1) {//drawdetails.lod >= children.rbegin()->min_visible_lod ) {
		// DRAW ALL
		for (kid=children.begin() ; kid != children.end() ; ++kid) {
			kid->drawable->draw(drawdetails);
		}
	} else {
		for (kid=children.begin() ; kid != children.end() ; ++kid) {
			if (0) //< kid->min_visible_lod )
				break; // all remaining are not visible
			kid->drawable->draw(drawdetails);
		}
	}
}


// Because our LOD Containers have at least 1 child that is drawn (Skyscrapers)
// this always returns true so actually slows things down.
#if 0
int DrawableLODContainer::isOccluded(drawdetails_t& drawdetails)
{
	if(drawdetails.lod < (children.begin())->min_visible_lod)
		return 1; // all not visible
	return 0;
}



*/