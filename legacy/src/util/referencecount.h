// (C) David Lawrence released under the GPL (see license.txt)
// Started:       02 Jan 2005
// Last modified: 02 Jan 2005

#ifndef REFERENCECOUNT_H

/**
 * Wraps pointers and counts references.
 * Can make copies, deletes pointer when all references have been destroyed
 */
template<class T>
class ReferenceCount {
public:
    ReferenceCount(T *c): p(c) {
	count = new int(1);
    };
    ReferenceCount(const ReferenceCount& r) {
	*this = r;
    };
    ~ReferenceCount() {
	--*count;
	if( *count <= 0 ) {
	    delete p;
	    delete count;
	}
    };
    ReferenceCount& operator=(const ReferenceCount& r) {
	p = r.p;
	count = r.count;
	++*count;
	return *this;
    };
    T* operator->() const { return p; };
    //int getCount(void) { return *count; };
private:
    int* count;
    T* p;
};


#endif
