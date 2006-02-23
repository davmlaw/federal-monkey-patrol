// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Tue Apr 12 22:19:08 2005
// Last modified: Tue Apr 12 22:19:08 2005

#ifndef AVERAGER
#define AVERAGER

#include <list>

/**
 * Averages objects.
 * Something that is averaged must implement operators:
 * /, *= and +
 */
template<class T>
class Averager {
public:
	Averager(unsigned int num = 0): sampleSize(num) { };
	~Averager() { };
	void reset(void) {
		sample.clear();
	};
	void add(const T& s) {
		sample.push_back(s);
	};
	void setSampleSize(unsigned int n) {
		sampleSize = n;
	};
	T getMean(void) {
		T sum;
		sum *= 0;
		if( sample.size() == 0 )
			return sum; //zero

		while( sampleSize && sample.size() > sampleSize ) {
			sample.pop_front();
		}

		typename samplelist_t::iterator i, end = sample.end();
		for( i=sample.begin() ; i != end ; ++i ) {
			sum += *i;
		}
		return sum / sample.size();
	};
private:
	typedef typename std::list<T> samplelist_t;
	samplelist_t sample;
	unsigned int sampleSize;
};

#endif // AVERAGER
