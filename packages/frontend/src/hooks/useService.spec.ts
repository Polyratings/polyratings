import { renderHook } from '@testing-library/react-hooks'
import { TeacherService } from '../services'
import { useService } from './useService'

describe('useService', () => {
    it('retrieves teacher service', () => {
        const { result } = renderHook(() => useService(TeacherService))
        expect(result.current[0]).toBeInstanceOf(TeacherService)
    })
})

