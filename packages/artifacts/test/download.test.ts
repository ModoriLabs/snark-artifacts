import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import maybeGetSnarkArtifactsBrowser from '../src/download/index.browser'
import maybeGetSnarkArtifacts from '../src/download/index.node'
import { Project } from '../src/projects'

const version = '1.0.0-beta.1'

describe('maybeGetSnarkArtifacts', () => {
  describe('browser', () => {
    it('Should return valid urls', async () => {
      const { wasm, zkey } = await maybeGetSnarkArtifactsBrowser(
        Project.POSEIDON,
        {
          parameters: ['2'],
          version,
        },
      )

      await expect(fetch(wasm)).resolves.toHaveProperty('ok', true)
      await expect(fetch(zkey)).resolves.toHaveProperty('ok', true)
    }, 20_000)

    it('should throw if the project is not supported', async () => {
      await expect(
        maybeGetSnarkArtifactsBrowser('project' as Project, {
          parameters: ['2'],
          version: 'latest',
        }),
      ).rejects.toThrow("Project 'project' is not supported")
    })

    it('Should return artifact file paths with parameters', async () => {
      const { wasm, zkey } = await maybeGetSnarkArtifactsBrowser(
        Project.POSEIDON,
        {
          parameters: ['2'],
        },
      )

      expect(wasm).toMatchInlineSnapshot(
        `"https://snark-artifacts.pse.dev/poseidon/latest/poseidon-2.wasm"`,
      )
      expect(zkey).toMatchInlineSnapshot(
        `"https://snark-artifacts.pse.dev/poseidon/latest/poseidon-2.zkey"`,
      )
    })

    it('Should return artifact files paths without parameters', async () => {
      const { wasm, zkey } = await maybeGetSnarkArtifactsBrowser(
        Project.SEMAPHORE,
      )

      expect(wasm).toMatchInlineSnapshot(
        `"https://snark-artifacts.pse.dev/semaphore/latest/semaphore.wasm"`,
      )
      expect(zkey).toMatchInlineSnapshot(
        `"https://snark-artifacts.pse.dev/semaphore/latest/semaphore.zkey"`,
      )
    })
  })

  describe('node', () => {
    let fetchSpy: jest.SpyInstance
    let mkdirSpy: jest.SpyInstance
    let createWriteStreamSpy: jest.SpyInstance
    let existsSyncSpy: jest.SpyInstance

    beforeEach(() => {
      createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream')
      existsSyncSpy = jest.spyOn(fs, 'existsSync')
      fetchSpy = jest.spyOn(global, 'fetch')
      mkdirSpy = jest.spyOn(fsPromises, 'mkdir')
      mkdirSpy.mockResolvedValue(undefined)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('Should throw an error if the project is not supported', async () => {
      await expect(
        maybeGetSnarkArtifacts('project' as Project, {
          parameters: ['2'],
          version: 'latest',
        }),
      ).rejects.toThrow("Project 'project' is not supported")

      await expect(
        maybeGetSnarkArtifactsBrowser('project' as Project),
      ).rejects.toThrow("Project 'project' is not supported")
    })

    it('Should throw on fetch errors', async () => {
      existsSyncSpy.mockReturnValue(false)
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        statusText: 'TEST',
        url: 'https://test.com',
      })

      await expect(
        maybeGetSnarkArtifacts(Project.POSEIDON, {
          parameters: ['2'],
          version: 'latest',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to fetch https://snark-artifacts.pse.dev/poseidon/latest/poseidon-2.wasm: TEST"`,
      )
    })

    it('Should throw if missing body', async () => {
      existsSyncSpy.mockReturnValue(false)
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      })

      await expect(
        maybeGetSnarkArtifacts(Project.POSEIDON, {
          parameters: ['2'],
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to get response body"`,
      )
    })

    it('Should throw on stream error', async () => {
      existsSyncSpy.mockReturnValue(false)
      const mockResponseStream = {
        body: {
          getReader: jest.fn(() => ({
            read: jest
              .fn()
              .mockRejectedValueOnce(new Error('TEST STREAM ERROR')),
          })),
        },
        ok: true,
        statusText: 'OK',
      }
      fetchSpy.mockResolvedValue(mockResponseStream)
      createWriteStreamSpy.mockReturnValue({
        close: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
      })

      await expect(
        maybeGetSnarkArtifacts(Project.POSEIDON, {
          parameters: ['2'],
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"TEST STREAM ERROR"`)
    })

    it("Should download files only if don't exist yet", async () => {
      existsSyncSpy.mockReturnValue(true)

      await maybeGetSnarkArtifacts(Project.POSEIDON, { parameters: ['2'] })

      expect(global.fetch).toHaveBeenCalledTimes(0)
    })

    it('Should return artifact file paths in node environment', async () => {
      mkdirSpy.mockRestore()
      existsSyncSpy.mockReturnValue(false)

      const { wasm, zkey } = await maybeGetSnarkArtifacts(Project.POSEIDON, {
        parameters: ['2'],
      })

      expect(wasm).toMatchInlineSnapshot(
        `"/tmp/snark-artifacts/poseidon/latest/poseidon-2.wasm"`,
      )
      expect(zkey).toMatchInlineSnapshot(
        `"/tmp/snark-artifacts/poseidon/latest/poseidon-2.zkey"`,
      )

      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://snark-artifacts.pse.dev/poseidon/latest/poseidon-2.wasm',
      )
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://snark-artifacts.pse.dev/poseidon/latest/poseidon-2.zkey',
      )
    }, 25_000)
  })
})
